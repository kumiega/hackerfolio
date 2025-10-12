import type { APIRoute } from "astro";
import type { ApiSuccessResponse, VersionDto } from "@/types";

// Disable prerendering for this API route
export const prerender = false;

/**
 * GET /api/v1/version
 *
 * Returns the current version and commit information of the application.
 * Used for monitoring, debugging, and deployment verification.
 *
 * @returns 200 - Version and commit information
 */
export const GET: APIRoute = async () => {
  // Get version from environment variable or package.json
  const version = import.meta.env.npm_package_version || "1.0.0";

  // Get commit hash from environment variable (typically set during build)
  const commit = import.meta.env.VITE_COMMIT_SHA || "unknown";

  const versionData: VersionDto = {
    version,
    commit,
  };

  const response: ApiSuccessResponse<VersionDto> = {
    data: versionData,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300", // Cache for 5 minutes
    },
  });
};
