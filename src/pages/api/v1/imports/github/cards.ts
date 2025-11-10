import type { APIRoute } from "astro";
import type { GenerateProjectCardsResultDto } from "@/types";
import { z } from "zod";
import { GitHubService } from "@/lib/services/github.service";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import { logError } from "@/lib/error-utils";
import { randomUUID } from "crypto";

// Disable prerendering for this API route
export const prerender = false;

/**
 * Zod schema for GitHub card generation validation
 */
const generateCardsSchema = z.object({
  repo_urls: z.array(z.string().url()).min(1).max(10),
  limit: z.number().int().min(1).max(10).optional().default(10),
});

/**
 * Type inferred from the schema
 */
type GenerateCardsCommand = z.infer<typeof generateCardsSchema>;

/**
 * POST /api/v1/imports/github/generate-cards
 *
 * Generates project card component data from GitHub repository URLs. This endpoint automatically
 * extracts repository information (title, description, tech stack) from GitHub and returns
 * card component data that can be added to draft_data by the client.
 *
 * The endpoint requires user authentication and does NOT create components in the database.
 * It returns component data for the client to merge into their portfolio draft_data.
 *
 * @param body.repo_urls - Array of valid GitHub repository URLs (1-10 URLs)
 * @param body.limit - Optional limit for components to generate (default: 10, max: 10)
 * @returns 200 - Component data generated successfully
 * @returns 401 - User not authenticated
 * @returns 422 - Invalid input data or validation errors
 * @returns 429 - GitHub API rate limit exceeded
 * @returns 502 - GitHub API unavailable
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async (context) => {
  const { locals, request } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();

  try {
    // Step 1: Authentication check
    if (!locals.user) {
      return createErrorResponse("UNAUTHENTICATED", requestId);
    }

    // Step 2: Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return createErrorResponse("INVALID_JSON", requestId);
    }

    // Step 3: Validate request data using Zod schema
    const validation = generateCardsSchema.safeParse(requestBody);
    if (!validation.success) {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Invalid request data", {
        issues: validation.error.issues,
      });
    }

    const command: GenerateCardsCommand = validation.data;

    // Step 4: Extract GitHub repository data and generate components
    const components: GenerateProjectCardsResultDto["components"] = [];

    // Process repositories sequentially to respect rate limits
    for (const repoUrl of command.repo_urls.slice(0, command.limit)) {
      try {
        // Extract owner and repo from URL
        const urlMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)\/?$/);
        if (!urlMatch) continue; // Skip invalid URLs

        const [, owner, repo] = urlMatch;

        // Fetch repository information
        const repoInfo = await GitHubService.fetchRepositoryInfo(repoUrl);

        // Fetch README content
        const readmeContent = await GitHubService.fetchReadmeContent(owner, repo);

        // Extract tech stack and summary
        const techStack = GitHubService.extractTechStack(readmeContent);
        // Also check repository topics for additional technologies
        const allTech = [...new Set([...techStack, ...repoInfo.topics.slice(0, 5)])]; // Limit topics to 5

        const summary = GitHubService.extractProjectSummary(readmeContent, repoInfo.description);

        // Create component data (not saved to DB, returned to client)
        components.push({
          id: randomUUID(),
          type: "cards",
          data: {
            cards: [
              {
                repo_url: repoUrl,
                title: repoInfo.name,
                summary,
                tech: allTech.slice(0, 20), // Limit to 20 technologies
              },
            ],
          },
        });
      } catch (error) {
        // Log individual repository errors but continue with others
        await logError(supabase, {
          message: `Failed to process repository ${repoUrl}`,
          severity: "warn",
          source: "api",
          endpoint: "POST /api/v1/imports/github/generate-cards",
          route: request.url,
          request_id: requestId,
          context: {
            repo_url: repoUrl,
            error: error instanceof Error ? error.message : String(error),
          },
        });
        // Continue with next repository instead of failing the entire request
      }
    }

    if (components.length === 0) {
      return createErrorResponse("VALIDATION_ERROR", requestId, "No valid repositories could be processed");
    }

    // Step 5: Return success response with component data
    const response: GenerateProjectCardsResultDto = {
      components,
    };

    return new Response(JSON.stringify({ data: response }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleApiError(error, {
      supabase,
      requestId,
      endpoint: "POST /api/v1/imports/github/generate-cards",
      route: request.url,
      userId: locals.user?.user_id,
    });
  }
};
