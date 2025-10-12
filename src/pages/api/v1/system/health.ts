import type { APIRoute } from "astro";
import type { ApiSuccessResponse, HealthDto } from "@/types";

// Disable prerendering for this API route
export const prerender = false;

/**
 * GET /api/v1/health
 *
 * Health check endpoint that returns the current status and timestamp.
 * Used for monitoring and load balancer health checks.
 *
 * @returns 200 - Health status and current timestamp
 */
export const GET: APIRoute = async () => {
  // Return current health status and timestamp
  const healthData: HealthDto = {
    status: "ok",
    time: new Date().toISOString(),
  };

  const response: ApiSuccessResponse<HealthDto> = {
    data: healthData,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate", // Health checks should not be cached
    },
  });
};
