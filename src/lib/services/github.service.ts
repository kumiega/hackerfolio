import type { SupabaseClient } from "@/db/supabase.client";
import type { GitHubRepoDto } from "@/types";
import { AppError } from "@/lib/error-handler";

/**
 * Visibility filter for GitHub repositories
 */
export type RepositoryVisibility = "all" | "public" | "private";

/**
 * Parameters for GitHub repository listing
 */
export interface GitHubReposParams {
  visibility?: RepositoryVisibility;
  q?: string;
  page?: number;
  per_page?: number;
}

/**
 * GitHub API repository response structure
 */
interface GitHubApiRepo {
  id: number;
  name: string;
  full_name: string;
  stargazers_count: number;
  html_url: string;
  private: boolean;
  archived: boolean;
  disabled: boolean;
  visibility: "public" | "private";
}

/**
 * GitHub API list repositories response
 */
interface GitHubApiReposResponse {
  data: GitHubApiRepo[];
  headers: {
    "x-ratelimit-remaining"?: string;
    "x-ratelimit-limit"?: string;
    "x-ratelimit-reset"?: string;
    link?: string;
  };
}

/**
 * Service for GitHub API integration
 *
 * Handles authentication, rate limiting, and repository data retrieval.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GitHubService {
  /**
   * Base URL for GitHub API
   */
  private static readonly GITHUB_API_BASE = "https://api.github.com";

  /**
   * Default pagination parameters
   */
  private static readonly DEFAULT_PAGE = 1;
  private static readonly DEFAULT_PER_PAGE = 30;
  private static readonly MAX_PER_PAGE = 100;

  /**
   * Validates GitHub access token and checks required scopes
   *
   * @param accessToken - GitHub OAuth access token
   * @returns Promise<void>
   * @throws AppError with code 'GITHUB_TOKEN_INVALID' for invalid tokens
   * @throws AppError with code 'GITHUB_TOKEN_INSUFFICIENT' for insufficient permissions
   */
  static async validateGitHubToken(accessToken: string): Promise<void> {
    try {
      // Test token by making a simple API call to get user info
      const response = await fetch(`${this.GITHUB_API_BASE}/user`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "Hackerfolio/1.0",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new AppError("GITHUB_TOKEN_INVALID", "Invalid GitHub access token");
        }
        if (response.status === 403) {
          throw new AppError(
            "GITHUB_TOKEN_INSUFFICIENT",
            "GitHub access token lacks required permissions (need 'repo' scope)"
          );
        }
        throw new AppError("GITHUB_API_ERROR", "Failed to validate GitHub token");
      }

      // Check rate limiting
      const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
      if (rateLimitRemaining && parseInt(rateLimitRemaining) === 0) {
        throw new AppError("GITHUB_RATE_LIMITED", "GitHub API rate limit exceeded");
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("GITHUB_API_ERROR", "Failed to validate GitHub token");
    }
  }

  /**
   * Retrieves GitHub repositories for the authenticated user
   *
   * @param supabase - Supabase client instance from context.locals
   * @param accessToken - GitHub OAuth access token
   * @param params - Query parameters for filtering and pagination
   * @returns Promise<{ repos: GitHubRepoDto[]; total: number; page: number; per_page: number }>
   * @throws AppError with code 'GITHUB_API_ERROR' for API failures
   * @throws AppError with code 'GITHUB_RATE_LIMITED' for rate limit exceeded
   * @throws AppError with code 'GITHUB_TOKEN_INVALID' for invalid/expired tokens
   */
  static async getUserRepositories(
    supabase: SupabaseClient,
    accessToken: string,
    params: GitHubReposParams = {}
  ): Promise<{ repos: GitHubRepoDto[]; total: number; page: number; per_page: number }> {
    const { visibility = "all", q, page = this.DEFAULT_PAGE, per_page = this.DEFAULT_PER_PAGE } = params;

    // Step 1: Validate GitHub access token
    await this.validateGitHubToken(accessToken);

    // Step 2: Validate pagination parameters
    if (page < 1) {
      throw new AppError("VALIDATION_ERROR", "Page must be greater than 0");
    }
    if (per_page < 1 || per_page > this.MAX_PER_PAGE) {
      throw new AppError("VALIDATION_ERROR", `Per page must be between 1 and ${this.MAX_PER_PAGE}`);
    }

    try {
      // Build GitHub API URL with query parameters
      const url = new URL(`${this.GITHUB_API_BASE}/user/repos`);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("per_page", per_page.toString());
      url.searchParams.set("sort", "updated");
      url.searchParams.set("direction", "desc");

      // Add visibility filter
      if (visibility !== "all") {
        url.searchParams.set("visibility", visibility);
      }

      // Add search query if provided (sanitized)
      const sanitizedQuery = q ? this.sanitizeSearchQuery(q) : "";

      // Make API request to GitHub
      const response = await this.makeGitHubRequest(url.toString(), accessToken);

      // Check for rate limiting
      const rateLimitRemaining = response.headers["x-ratelimit-remaining"];
      if (rateLimitRemaining && parseInt(rateLimitRemaining) === 0) {
        throw new AppError("GITHUB_RATE_LIMITED", "GitHub API rate limit exceeded");
      }

      // Transform and filter repositories
      let repos = response.data.map(this.transformGitHubRepo);

      // Apply client-side filtering for search query
      if (sanitizedQuery) {
        const searchTerm = sanitizedQuery.toLowerCase();
        repos = repos.filter(
          (repo) => repo.name.toLowerCase().includes(searchTerm) || repo.full_name.toLowerCase().includes(searchTerm)
        );
      }

      // Extract pagination info from Link header
      const paginationInfo = this.extractPaginationInfo();

      return {
        repos,
        total: paginationInfo.total,
        page,
        per_page,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      // Handle GitHub API errors
      if (error.name === "GITHUB_RATE_LIMITED") {
        throw error; // Re-throw rate limiting errors
      }

      if (error.status === 401) {
        throw new AppError("GITHUB_TOKEN_INVALID", "Invalid or expired GitHub access token");
      }

      if (error.status === 403) {
        throw new AppError("GITHUB_TOKEN_INSUFFICIENT", "GitHub access token lacks required permissions");
      }

      // Log unexpected errors and throw generic API error
      throw new AppError("GITHUB_API_ERROR", "Failed to retrieve repositories from GitHub");
    }
  }

  /**
   * Makes an authenticated request to the GitHub API
   *
   * @param url - GitHub API endpoint URL
   * @param accessToken - GitHub OAuth access token
   * @returns Promise<GitHubApiReposResponse>
   * @throws Error with status property for HTTP errors
   */
  private static async makeGitHubRequest(url: string, accessToken: string): Promise<GitHubApiReposResponse> {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Hackerfolio/1.0",
      },
    });

    if (!response.ok) {
      const error = new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
      (error as Error & { status: number }).status = response.status;
      throw error;
    }

    const data: GitHubApiRepo[] = await response.json();

    return {
      data,
      headers: {
        "x-ratelimit-remaining": response.headers.get("x-ratelimit-remaining") || undefined,
        "x-ratelimit-limit": response.headers.get("x-ratelimit-limit") || undefined,
        "x-ratelimit-reset": response.headers.get("x-ratelimit-reset") || undefined,
        link: response.headers.get("link") || undefined,
      },
    };
  }

  /**
   * Transforms GitHub API repository data to our DTO format
   *
   * @param repo - GitHub API repository object
   * @returns GitHubRepoDto
   */
  private static transformGitHubRepo(repo: GitHubApiRepo): GitHubRepoDto {
    return {
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      stargazers_count: repo.stargazers_count,
      html_url: repo.html_url,
    };
  }

  /**
   * Sanitizes search query to prevent injection attacks
   *
   * @param query - Raw search query string
   * @returns Sanitized query string
   */
  private static sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== "string") {
      return "";
    }

    // Trim whitespace
    let sanitized = query.trim();

    // Remove potentially dangerous characters that could be used for injection
    // Allow only alphanumeric characters, spaces, hyphens, and underscores
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_]/g, "");

    // Limit length to prevent excessive processing
    const MAX_QUERY_LENGTH = 100;
    if (sanitized.length > MAX_QUERY_LENGTH) {
      sanitized = sanitized.substring(0, MAX_QUERY_LENGTH);
    }

    return sanitized;
  }

  /**
   * Extracts pagination information from GitHub's Link header
   *
   * @returns Object with total count and pagination info
   */
  private static extractPaginationInfo(): { total: number } {
    // GitHub API doesn't provide total count in headers
    // We'll return a placeholder - frontend can implement "load more" pattern
    return { total: 0 };
  }
}
