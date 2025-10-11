import type { APIRoute } from "astro";
import type { AuthSessionDto, GenerateProjectCardsResultDto } from "@/types";
import { AuthService } from "@/lib/services/auth.service";
import { GitHubService } from "@/lib/services/github.service";
import { ComponentService } from "@/lib/services/component.service";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import { logError } from "@/lib/error-utils";
import { generateProjectCardsCommandSchema } from "@/lib/schemas/component.schemas";

// Disable prerendering for this API route
export const prerender = false;

/**
 * POST /api/v1/imports/github/generate-project-cards
 *
 * Generates project card components from GitHub repository URLs. This endpoint automatically
 * extracts repository information (title, description, tech stack) from GitHub and creates
 * corresponding project_card components in the specified section.
 *
 * The endpoint requires user authentication and validates that the user owns the target section.
 * It also enforces portfolio component limits (maximum 15 components total per portfolio).
 *
 * @param body.section_id - UUID of the target section where components will be created
 * @param body.repo_urls - Array of valid GitHub repository URLs (1-10 URLs)
 * @param body.limit - Optional limit for components to create (default: 10, max: 10)
 * @returns 201 - Components created successfully with count and component data
 * @returns 401 - User not authenticated or section ownership violation
 * @returns 404 - Section not found
 * @returns 409 - Component limit exceeded (15 per portfolio)
 * @returns 422 - Invalid input data or validation errors
 * @returns 429 - GitHub API rate limit exceeded
 * @returns 502 - GitHub API unavailable
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async (context) => {
  const { locals, request } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();
  let authenticatedUser: AuthSessionDto | null = null;

  try {
    // Step 1: Authentication check
    authenticatedUser = await AuthService.getCurrentSession(supabase);
    if (!authenticatedUser) {
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
    const validation = generateProjectCardsCommandSchema.safeParse(requestBody);
    if (!validation.success) {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Invalid request data", {
        issues: validation.error.issues,
      });
    }

    const command = validation.data;

    // Step 4: Verify section ownership and component limits
    // Check if section exists and user owns it (RLS will handle ownership)
    const { data: sectionData, error: sectionError } = await supabase
      .from("sections")
      .select("portfolio_id")
      .eq("id", command.section_id)
      .single();

    if (sectionError || !sectionData) {
      if (sectionError?.code === "PGRST116") {
        return createErrorResponse("SECTION_NOT_FOUND", requestId);
      }
      return createErrorResponse("DATABASE_ERROR", requestId);
    }

    // Get all section IDs for the portfolio to check component limits
    const { data: sectionIds, error: sectionsError } = await supabase
      .from("sections")
      .select("id")
      .eq("portfolio_id", sectionData.portfolio_id);

    if (sectionsError) {
      return createErrorResponse("DATABASE_ERROR", requestId);
    }

    const sectionIdArray = sectionIds?.map((s) => s.id) || [];

    // Check current component count against portfolio limit (15 components max)
    const { count: componentCount, error: countError } = await supabase
      .from("components")
      .select("*", { count: "exact", head: true })
      .in("section_id", sectionIdArray);

    if (countError) {
      return createErrorResponse("DATABASE_ERROR", requestId);
    }

    // Check if adding new components would exceed the limit
    const currentCount = componentCount || 0;
    const requestedCount = Math.min(command.repo_urls.length, command.limit);
    if (currentCount + requestedCount > 15) {
      return createErrorResponse(
        "COMPONENT_LIMIT_REACHED",
        requestId,
        `Cannot create ${requestedCount} components. Portfolio already has ${currentCount} components (maximum 15 allowed)`,
        {
          currentCount,
          requestedCount,
          maxAllowed: 15,
        }
      );
    }

    // Step 5: Extract GitHub repository data
    const projectCards: {
      repo_url: string;
      title: string;
      summary: string;
      tech: string[];
    }[] = [];

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

        projectCards.push({
          repo_url: repoUrl,
          title: repoInfo.name,
          summary,
          tech: allTech.slice(0, 20), // Limit to 20 technologies
        });
      } catch (error) {
        // Log individual repository errors but continue with others
        await logError(supabase, {
          message: `Failed to process repository ${repoUrl}`,
          severity: "warn",
          source: "api",
          endpoint: "POST /api/v1/imports/github/generate-project-cards",
          route: request.url,
          request_id: requestId,
          context: {
            repo_url: repoUrl,
            error: error instanceof Error ? error.message : String(error),
          },
          portfolio_id: sectionData.portfolio_id,
        });
        // Continue with next repository instead of failing the entire request
      }
    }

    if (projectCards.length === 0) {
      return createErrorResponse("VALIDATION_ERROR", requestId, "No valid repositories could be processed");
    }

    // Step 6: Create project card components
    const createdComponents = await ComponentService.createProjectCardComponents(
      supabase,
      command.section_id,
      authenticatedUser.user.id,
      projectCards
    );

    // Step 7: Return success response
    const response: GenerateProjectCardsResultDto = {
      created: createdComponents.length,
      components: createdComponents,
    };

    return new Response(JSON.stringify({ data: response }), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleApiError(error, {
      supabase,
      requestId,
      endpoint: "POST /api/v1/imports/github/generate-project-cards",
      route: request.url,
      userId: authenticatedUser?.user?.id,
    });
  }
};
