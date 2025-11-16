import type { APIRoute } from "astro";
import type { GenerateProjectCardsResultDto } from "@/types";
import { z } from "zod";
import { GitHubService } from "@/lib/services/github.service";
import { OpenRouterService } from "@/lib/services/open-router.service";
import { handleApiError, createErrorResponse, AppError } from "@/lib/error-handler";
import { logError } from "@/lib/error-utils";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import type { SupabaseClient } from "@/db/supabase.client";

// Read the project summary prompt
const projectSummaryPrompt = readFileSync(join(process.cwd(), "src/lib/prompts/project-summary.md"), "utf-8");

/**
 * Detects the language of the portfolio using AI by analyzing the bio section
 *
 * @param bioText - The bio text content from portfolio draft
 * @returns Detected language name (e.g., "Polish", "English", "Spanish") or "English" as default
 */
async function detectPortfolioLanguage(bioText: string): Promise<string> {
  if (!bioText || bioText.trim().length < 10) {
    return "English";
  }

  try {
    const prompt = `Analyze this text and determine the primary language. Respond with only the language name (e.g., "English", "Polish", "Spanish", "French", etc.):

${bioText.substring(0, 500)}`; // Limit text to avoid token limits

    const detectedLanguage = await OpenRouterService.generateDescription(prompt);
    const cleanLanguage = detectedLanguage.trim();

    // Validate the response is a reasonable language name
    if (cleanLanguage.length > 1 && cleanLanguage.length < 50 && !cleanLanguage.includes("\n")) {
      return cleanLanguage;
    }

    // eslint-disable-next-line no-console
    console.warn("AI language detection returned invalid response:", cleanLanguage);
    return "English";
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Failed to detect language using AI, falling back to English:", error);
    return "English";
  }
}

/**
 * Retrieves the GitHub access token for the authenticated user
 *
 * Uses a custom oauth_tokens table to store OAuth access tokens securely.
 * This table is populated when users connect their GitHub account.
 *
 * @param supabase - Supabase client instance
 * @returns Promise<string> - GitHub access token
 * @throws AppError with code 'UNAUTHENTICATED' if user is not authenticated
 * @throws AppError with code 'GITHUB_TOKEN_INVALID' if token is not found or expired
 */
async function getGitHubAccessToken(supabase: SupabaseClient): Promise<string> {
  // Step 1: Get authenticated user (use getUser() for security, fallback to getSession())
  let user;
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser || !authUser.id) {
    // Fallback to getSession() if getUser() fails
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user || !session.user.id) {
      throw new AppError("UNAUTHENTICATED");
    }

    user = session.user;
  } else {
    user = authUser;
  }

  // Step 2: Retrieve GitHub access token from oauth_tokens table
  // This table is populated by OAuth webhooks or callback handlers
  const { data: tokenData, error: tokenError } = await supabase
    .from("oauth_tokens")
    .select("access_token, expires_at, refresh_token")
    .eq("user_id", user.id)
    .eq("provider", "github")
    .single();

  if (tokenError) {
    // eslint-disable-next-line no-console
    console.error("OAuth token query error:", {
      code: tokenError.code,
      message: tokenError.message,
      userId: user.id,
    });

    if (tokenError.code === "PGRST116") {
      // Table doesn't exist
      throw new AppError("GITHUB_TOKEN_INVALID", "GitHub integration not configured. Please contact support.");
    }
    throw new AppError("GITHUB_TOKEN_INVALID", "GitHub access token not found. Please connect your GitHub account.");
  }

  if (!tokenData?.access_token) {
    // eslint-disable-next-line no-console
    console.error("No access token found in oauth_tokens:", {
      userId: user.id,
      tokenData: !!tokenData,
      hasAccessToken: !!tokenData?.access_token,
    });
    throw new AppError("GITHUB_TOKEN_INVALID", "GitHub access token not found. Please reconnect your GitHub account.");
  }

  // Step 3: Check if token is expired (GitHub tokens are typically long-lived but can be revoked)
  if (tokenData.expires_at) {
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();

    if (expiresAt <= now) {
      // Token is expired
      throw new AppError(
        "GITHUB_TOKEN_INVALID",
        "GitHub access token has expired. Please reconnect your GitHub account."
      );
    }
  }

  return tokenData.access_token;
}

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
 * POST /api/v1/imports/github/cards
 *
 * Generates project card component data from GitHub repository URLs. This endpoint automatically
 * extracts repository information (title, description, tech stack) from GitHub and returns
 * card component data that can be added to draft_data by the client.
 *
 * The endpoint requires user authentication with a valid GitHub OAuth token and does NOT create
 * components in the database. It returns component data for the client to merge into their portfolio draft_data.
 *
 * @param body.repo_urls - Array of valid GitHub repository URLs (1-10 URLs)
 * @param body.limit - Optional limit for components to generate (default: 10, max: 10)
 * @returns 200 - Component data generated successfully
 * @returns 401 - User not authenticated or GitHub token missing/invalid
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
    // Step 1: Get GitHub access token for authenticated user
    const githubAccessToken = await getGitHubAccessToken(locals.supabase);

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

    // Step 4: Fetch user's portfolio to detect language
    let portfolioLanguage = "English";
    try {
      const portfolioResponse = await fetch(`${new URL(request.url).origin}/api/v1/portfolios/me`, {
        headers: {
          Cookie: request.headers.get("cookie") || "",
        },
      });

      if (portfolioResponse.ok) {
        const portfolioData = await portfolioResponse.json();
        const draftData = portfolioData.data?.draft_data;

        // Extract bio text for language detection
        let bioText = "";
        if (draftData?.bio?.summary && typeof draftData.bio.summary === "string") {
          bioText += draftData.bio.summary + " ";
        }
        if (draftData?.bio?.position && typeof draftData.bio.position === "string") {
          bioText += draftData.bio.position;
        }

        if (bioText.trim()) {
          portfolioLanguage = await detectPortfolioLanguage(bioText.trim());
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to fetch portfolio for language detection, using English as default:", error);
      // Continue with English as default
    }

    // Step 5: Extract GitHub repository data and generate components
    const components: GenerateProjectCardsResultDto["components"] = [];

    // Process repositories sequentially to respect rate limits
    for (const repoUrl of command.repo_urls.slice(0, command.limit)) {
      try {
        // Extract owner and repo from URL
        const urlMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)\/?$/);
        if (!urlMatch) continue; // Skip invalid URLs

        const [, owner, repo] = urlMatch;

        // Fetch repository information
        const repoInfo = await GitHubService.fetchRepositoryInfo(repoUrl, githubAccessToken);

        // Fetch README content for tech stack extraction
        const readmeContent = await GitHubService.fetchReadmeContent(owner, repo, githubAccessToken);

        // Extract tech stack
        const techStack = GitHubService.extractTechStack(readmeContent);
        // Also check repository topics for additional technologies
        const allTech = [...new Set([...techStack, ...repoInfo.topics.slice(0, 5)])]; // Limit topics to 5

        // Generate AI-powered summary in the detected portfolio language
        let summary: string;
        try {
          const formattedPrompt = projectSummaryPrompt
            .replace(/\{language\}/g, portfolioLanguage)
            .replace(/\{repo_name\}/g, repoInfo.name)
            .replace(/\{repo_description\}/g, repoInfo.description || "")
            .replace(/\{technologies\}/g, allTech.slice(0, 5).join(", ")); // Limit tech to first 5

          summary = await OpenRouterService.generateProjectSummary(formattedPrompt);
        } catch (summaryError) {
          // eslint-disable-next-line no-console
          console.warn(`Failed to generate AI summary for ${repoUrl}, falling back to description:`, summaryError);
          // Fallback to repository description
          summary = repoInfo.description || "No description available.";
        }

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
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorCode = (error as { code?: string })?.code || "UNKNOWN_ERROR";

        await logError(supabase, {
          message: `Failed to process repository ${repoUrl}: ${errorMessage}`,
          severity: "warn",
          source: "api",
          error_code: errorCode,
          endpoint: "POST /api/v1/imports/github/cards",
          route: request.url,
          request_id: requestId,
          context: {
            repo_url: repoUrl,
            error_message: errorMessage,
            error_code: errorCode,
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
