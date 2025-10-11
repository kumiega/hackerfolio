import type { APIRoute } from "astro";
import { GitHubService } from "@/lib/services/github.service";
import { githubReposQuerySchema } from "@/lib/schemas/github.schemas";
import { logError } from "@/lib/error-utils";
import { checkRateLimit, githubRateLimiter } from "@/lib/utils/rate-limit";
import { AppError } from "@/lib/error-handler";
import type { SupabaseClient } from "@/db/supabase.client";
import type { ApiSuccessResponse, ApiErrorResponse } from "@/types";
import type { RepositoryVisibility } from "@/lib/services/github.service";

// Disable prerendering for this API route
export const prerender = false;

/**
 * GET /api/v1/imports/github/repos
 *
 * Retrieves a list of GitHub repositories for the authenticated user.
 * Requires a valid GitHub OAuth access token.
 *
 * Query Parameters:
 * - visibility: "all" | "public" | "private" (default: "all")
 * - q: string - Search query to filter repositories by name
 * - page: number - Page number for pagination (default: 1)
 * - per_page: number - Items per page (default: 30, max: 100)
 *
 * @returns 200 - List of repositories with pagination metadata
 * @returns 400 - Invalid query parameters
 * @returns 401 - Missing or invalid GitHub access token
 * @returns 403 - Insufficient GitHub token permissions
 * @returns 429 - GitHub API rate limit exceeded
 * @returns 500 - Internal server error or GitHub API failure
 */
export const GET: APIRoute = async (context) => {
  const { locals, url } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();

  // Extract user ID for error logging and rate limiting
  let userId: string | undefined;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id;
  } catch {
    // Ignore auth errors here, will be handled in getGitHubAccessToken
  }

  // Apply rate limiting based on user ID (fallback to IP if user not authenticated)
  const rateLimitIdentifier = userId || context.request.headers.get("x-forwarded-for") || "anonymous";
  const rateLimitResponse = checkRateLimit(rateLimitIdentifier, githubRateLimiter);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Initialize validated params for error logging
  let validatedParams: { visibility?: RepositoryVisibility; q?: string; page?: number; per_page?: number } = {};

  try {
    // Get GitHub access token for authenticated user
    const githubAccessToken = await getGitHubAccessToken(supabase);

    // Parse and validate query parameters
    const urlParams = new URL(url).searchParams;
    const queryParams = {
      visibility: urlParams.get("visibility") || undefined,
      q: urlParams.get("q") || undefined,
      page: urlParams.get("page") || undefined,
      per_page: urlParams.get("per_page") || undefined,
    };

    const validationResult = githubReposQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: validationResult.error.issues,
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    validatedParams = validationResult.data;

    // Call GitHub service to retrieve repositories
    const result = await GitHubService.getUserRepositories(supabase, githubAccessToken, validatedParams);

    // Build success response with pagination metadata
    const response: ApiSuccessResponse = {
      data: result.repos,
      meta: {
        page: result.page,
        per_page: result.per_page,
        total: result.total,
        total_pages: Math.ceil(result.total / result.per_page),
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    // Handle specific GitHub-related errors
    const err = error as { name?: string; message?: string; status?: number; code?: string };

    // Rate limiting
    if (err.name === "GITHUB_RATE_LIMITED" || err.message?.includes("rate limit")) {
      await logError(supabase, {
        message: "GitHub API rate limit exceeded",
        severity: "warn",
        source: "api",
        error_code: "GITHUB_RATE_LIMITED",
        endpoint: "GET /api/v1/imports/github/repos",
        route: "/api/v1/imports/github/repos",
        request_id: requestId,
        context: {
          visibility: validatedParams?.visibility,
          q: validatedParams?.q,
          page: validatedParams?.page,
          per_page: validatedParams?.per_page,
        },
      });

      const errorResponse: ApiErrorResponse = {
        error: {
          code: "GITHUB_RATE_LIMITED",
          message: "GitHub API rate limit exceeded. Please try again later.",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "3600", // Suggest retry after 1 hour
        },
      });
    }

    // Token issues
    if (err.name === "GITHUB_TOKEN_INVALID" || err.message?.includes("token")) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "GITHUB_TOKEN_INVALID",
          message: "Invalid or expired GitHub access token",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Permission issues
    if (err.name === "GITHUB_TOKEN_INSUFFICIENT" || err.status === 403) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "GITHUB_TOKEN_INSUFFICIENT",
          message: "GitHub access token lacks required permissions",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Log unexpected errors and return generic error response
    await logError(supabase, {
      message: (err as Error)?.message || "Unexpected error in GitHub repos endpoint",
      severity: "error",
      source: "api",
      error_code: "GITHUB_API_ERROR",
      endpoint: "GET /api/v1/imports/github/repos",
      route: "/api/v1/imports/github/repos",
      request_id: requestId,
      stack: (err as Error)?.stack,
      context: {
        user_id: userId,
        visibility: validatedParams?.visibility,
        q: validatedParams?.q,
        page: validatedParams?.page,
        per_page: validatedParams?.per_page,
        error_name: err.name,
        error_status: err.status,
      },
    });

    const errorResponse: ApiErrorResponse = {
      error: {
        code: "GITHUB_API_ERROR",
        message: "Failed to retrieve repositories from GitHub",
        requestId,
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

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
  // Step 1: Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.id) {
    throw new AppError("UNAUTHENTICATED");
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
    if (tokenError.code === "PGRST116") {
      // Table doesn't exist
      throw new AppError("GITHUB_TOKEN_INVALID", "GitHub integration not configured. Please contact support.");
    }
    throw new AppError("GITHUB_TOKEN_INVALID", "GitHub access token not found. Please connect your GitHub account.");
  }

  if (!tokenData?.access_token) {
    throw new AppError("GITHUB_TOKEN_INVALID", "GitHub access token not found. Please reconnect your GitHub account.");
  }

  // Step 3: Check if token is expired and attempt refresh if possible
  if (tokenData.expires_at) {
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes buffer

    if (expiresAt <= fiveMinutesFromNow) {
      // Token is expired or will expire soon
      if (tokenData.refresh_token) {
        // TODO: Implement token refresh logic here
        // This would call GitHub's token refresh endpoint and update the database
        throw new AppError(
          "GITHUB_TOKEN_INVALID",
          "GitHub access token has expired. Please reconnect your GitHub account."
        );
      } else {
        throw new AppError(
          "GITHUB_TOKEN_INVALID",
          "GitHub access token has expired. Please reconnect your GitHub account."
        );
      }
    }
  }

  return tokenData.access_token;
}
