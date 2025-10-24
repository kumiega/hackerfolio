import type { GitHubRepoDto } from "@/types";
import { AppError } from "@/lib/error-handler";
import { ERROR_CODES } from "@/lib/error-constants";

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
   * @param accessToken - GitHub OAuth access token
   * @param params - Query parameters for filtering and pagination
   * @returns Promise<{ repos: GitHubRepoDto[]; total: number; page: number; per_page: number }>
   * @throws AppError with code 'GITHUB_API_ERROR' for API failures
   * @throws AppError with code 'GITHUB_RATE_LIMITED' for rate limit exceeded
   * @throws AppError with code 'GITHUB_TOKEN_INVALID' for invalid/expired tokens
   */
  static async getUserRepositories(
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

  /**
   * Fetches basic repository information from GitHub API
   *
   * @param repoUrl - GitHub repository URL (e.g., "https://github.com/owner/repo")
   * @param accessToken - Optional GitHub access token for private repos
   * @returns Promise<{name: string, description: string | null, topics: string[]}>
   * @throws AppError for API failures or invalid URLs
   */
  static async fetchRepositoryInfo(
    repoUrl: string,
    accessToken?: string
  ): Promise<{ name: string; description: string | null; topics: string[] }> {
    // Parse repository URL to extract owner and repo name
    const urlMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)\/?$/);
    if (!urlMatch) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid GitHub repository URL format");
    }

    const [, owner, repo] = urlMatch;

    try {
      const apiUrl = `${this.GITHUB_API_BASE}/repos/${owner}/${repo}`;

      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "User-Agent": "Hackerfolio/1.0",
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(apiUrl, { headers });

      if (!response.ok) {
        if (response.status === 401) {
          throw new AppError(ERROR_CODES.GITHUB_TOKEN_INVALID, "Invalid or expired GitHub access token");
        }
        if (response.status === 403) {
          throw new AppError(ERROR_CODES.GITHUB_TOKEN_INSUFFICIENT, "GitHub access token lacks required permissions");
        }
        if (response.status === 404) {
          throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Repository not found or access denied");
        }
        throw new AppError(ERROR_CODES.GITHUB_API_ERROR, `GitHub API error: ${response.status}`);
      }

      const repoData = await response.json();

      return {
        name: repoData.name || repo,
        description: repoData.description || null,
        topics: repoData.topics || [],
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.GITHUB_API_ERROR, "Failed to fetch repository information");
    }
  }

  /**
   * Fetches README content from a GitHub repository
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param accessToken - Optional GitHub access token for private repos
   * @returns Promise<string> - README content in markdown format
   * @throws AppError for API failures
   */
  static async fetchReadmeContent(owner: string, repo: string, accessToken?: string): Promise<string> {
    try {
      const apiUrl = `${this.GITHUB_API_BASE}/repos/${owner}/${repo}/readme`;

      const headers: Record<string, string> = {
        Accept: "application/vnd.github.raw+json",
        "User-Agent": "Hackerfolio/1.0",
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(apiUrl, { headers });

      if (!response.ok) {
        if (response.status === 404) {
          // Repository has no README - return empty string
          return "";
        }
        if (response.status === 401) {
          throw new AppError(ERROR_CODES.GITHUB_TOKEN_INVALID, "Invalid or expired GitHub access token");
        }
        if (response.status === 403) {
          throw new AppError(ERROR_CODES.GITHUB_TOKEN_INSUFFICIENT, "GitHub access token lacks required permissions");
        }
        throw new AppError(ERROR_CODES.GITHUB_API_ERROR, `GitHub API error: ${response.status}`);
      }

      const readmeContent = await response.text();
      return readmeContent;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.GITHUB_API_ERROR, "Failed to fetch README content");
    }
  }

  /**
   * Extracts technology stack from README content using pattern matching
   *
   * @param content - README content in markdown format
   * @returns Array of technology names (max 20)
   */
  static extractTechStack(content: string): string[] {
    if (!content) return [];

    const techStack: string[] = [];
    const contentLower = content.toLowerCase();

    // Common technology patterns to look for
    const techPatterns = [
      // Programming languages
      { pattern: /\b(?:javascript|js|typescript|ts)\b/g, tech: "JavaScript" },
      { pattern: /\b(?:python|py)\b/g, tech: "Python" },
      { pattern: /\b(?:java)\b/g, tech: "Java" },
      { pattern: /\b(?:csharp|c#)\b/g, tech: "C#" },
      { pattern: /\b(?:cpp|c\+\+)\b/g, tech: "C++" },
      { pattern: /\b(?:php)\b/g, tech: "PHP" },
      { pattern: /\b(?:ruby|rb)\b/g, tech: "Ruby" },
      { pattern: /\b(?:go|golang)\b/g, tech: "Go" },
      { pattern: /\b(?:rust)\b/g, tech: "Rust" },
      { pattern: /\b(?:swift)\b/g, tech: "Swift" },
      { pattern: /\b(?:kotlin)\b/g, tech: "Kotlin" },
      { pattern: /\b(?:dart)\b/g, tech: "Dart" },

      // Web frameworks
      { pattern: /\b(?:react|reactjs|react\.js)\b/g, tech: "React" },
      { pattern: /\b(?:vue|vuejs|vue\.js)\b/g, tech: "Vue.js" },
      { pattern: /\b(?:angular)\b/g, tech: "Angular" },
      { pattern: /\b(?:svelte)\b/g, tech: "Svelte" },
      { pattern: /\b(?:next|nextjs|next\.js)\b/g, tech: "Next.js" },
      { pattern: /\b(?:nuxt|nuxtjs|nuxt\.js)\b/g, tech: "Nuxt.js" },
      { pattern: /\b(?:express|expressjs)\b/g, tech: "Express.js" },
      { pattern: /\b(?:django)\b/g, tech: "Django" },
      { pattern: /\b(?:flask)\b/g, tech: "Flask" },
      { pattern: /\b(?:laravel)\b/g, tech: "Laravel" },
      { pattern: /\b(?:rails|ruby on rails)\b/g, tech: "Ruby on Rails" },

      // Frontend/UI
      { pattern: /\b(?:html|html5)\b/g, tech: "HTML" },
      { pattern: /\b(?:css|css3)\b/g, tech: "CSS" },
      { pattern: /\b(?:sass|scss)\b/g, tech: "Sass" },
      { pattern: /\b(?:tailwind|tailwindcss)\b/g, tech: "Tailwind CSS" },
      { pattern: /\b(?:bootstrap)\b/g, tech: "Bootstrap" },

      // Backend/Node.js
      { pattern: /\b(?:node|nodejs|node\.js)\b/g, tech: "Node.js" },
      { pattern: /\b(?:npm)\b/g, tech: "npm" },
      { pattern: /\b(?:yarn)\b/g, tech: "Yarn" },

      // Databases
      { pattern: /\b(?:mongodb|mongo)\b/g, tech: "MongoDB" },
      { pattern: /\b(?:postgresql|postgres|psql)\b/g, tech: "PostgreSQL" },
      { pattern: /\b(?:mysql)\b/g, tech: "MySQL" },
      { pattern: /\b(?:redis)\b/g, tech: "Redis" },
      { pattern: /\b(?:sqlite)\b/g, tech: "SQLite" },

      // Cloud/DevOps
      { pattern: /\b(?:docker)\b/g, tech: "Docker" },
      { pattern: /\b(?:kubernetes|k8s)\b/g, tech: "Kubernetes" },
      { pattern: /\b(?:aws|amazon web services)\b/g, tech: "AWS" },
      { pattern: /\b(?:gcp|google cloud)\b/g, tech: "Google Cloud" },
      { pattern: /\b(?:azure)\b/g, tech: "Azure" },
      { pattern: /\b(?:vercel)\b/g, tech: "Vercel" },
      { pattern: /\b(?:netlify)\b/g, tech: "Netlify" },

      // Mobile
      { pattern: /\b(?:react native|react-native)\b/g, tech: "React Native" },
      { pattern: /\b(?:flutter)\b/g, tech: "Flutter" },
      { pattern: /\b(?:ios|swiftui)\b/g, tech: "iOS" },
      { pattern: /\b(?:android)\b/g, tech: "Android" },
    ];

    // Look for technologies in content
    for (const { pattern, tech } of techPatterns) {
      if (pattern.test(contentLower) && !techStack.includes(tech)) {
        techStack.push(tech);
      }
    }

    // Also check for tech stack sections in README
    const techSectionRegex =
      /#+\s*(?:tech|technology|stack|built with|tools|frameworks?|languages?)\s*#*\n([\s\S]*?)(?=\n#+\s*|$)/gi;
    const techSections = content.match(techSectionRegex);

    if (techSections) {
      for (const section of techSections) {
        // Extract list items from tech sections
        const listItems = section.match(/[-*+]\s*([^\n]+)/g);
        if (listItems) {
          for (const item of listItems) {
            const tech = item.replace(/^[-*+]\s*/, "").trim();
            if (tech && tech.length <= 20 && !techStack.includes(tech)) {
              techStack.push(tech);
            }
          }
        }
      }
    }

    // Limit to 20 technologies and return
    return techStack.slice(0, 20);
  }

  /**
   * Extracts project summary from README content
   *
   * @param content - README content in markdown format
   * @param repoDescription - Repository description from GitHub API
   * @returns Project summary (max 500 characters)
   */
  static extractProjectSummary(content: string, repoDescription: string | null): string {
    if (!content) {
      return repoDescription || "No description available.";
    }

    // Look for description sections
    const descriptionPatterns = [
      /#+\s*(?:description|about|overview)\s*#*\n([\s\S]*?)(?=\n#+\s*|$)/gi,
      /#+\s*project\s*#*\n([\s\S]*?)(?=\n#+\s*|$)/gi,
      /^([\s\S]*?)(?=\n#+\s*|$)/, // First paragraph
    ];

    for (const pattern of descriptionPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        let summary = match[1].trim();

        // Clean up markdown formatting
        summary = summary
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links, keep text
          .replace(/[*_`~]/g, "") // Remove emphasis markers
          .replace(/\n+/g, " ") // Replace newlines with spaces
          .trim();

        if (summary.length > 10) {
          // Ensure we have meaningful content
          return summary.length > 500 ? summary.substring(0, 497) + "..." : summary;
        }
      }
    }

    // Fallback to repository description
    if (repoDescription) {
      return repoDescription.length > 500 ? repoDescription.substring(0, 497) + "..." : repoDescription;
    }

    return "No description available.";
  }
}
