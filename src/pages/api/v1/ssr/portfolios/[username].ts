import type { APIRoute } from "astro";
import type { ApiSuccessResponse, ApiErrorResponse, PublicPortfolioDto } from "@/types";
import { PortfolioService } from "@/lib/services/portfolio.service";
import { supabaseServiceClient } from "@/db/supabase.client";
import { ERROR_CODES } from "@/lib/error-constants";
import { logError } from "@/lib/error-utils";

// Disable prerendering for this API route
export const prerender = false;

/**
 * GET /api/v1/ssr/portfolios/:username
 *
 * Retrieves published portfolio data for server-side rendering (SSR).
 * This endpoint requires service role authentication and returns complete
 * portfolio data including sections and components for the specified username.
 *
 * @param username - Username of the portfolio owner (must match ^[a-z0-9-]{3,30}$ regex)
 * @returns 200 - Public portfolio data for SSR
 * @returns 401 - Invalid or missing service role key
 * @returns 404 - Username not found or portfolio not published
 * @returns 500 - Internal server error
 */
export const GET: APIRoute = async (context) => {
  const { params, request } = context;
  const requestId = crypto.randomUUID();

  try {
    // Step 1: Extract and validate username parameter
    const username = params.username as string;

    if (!username) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Username parameter is required",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate username format against regex pattern
    const usernameRegex = /^[a-z0-9-]{3,30}$/;
    if (!usernameRegex.test(username)) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Username must be 3-30 characters, containing only lowercase letters, numbers, and hyphens",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 2: Validate service role authentication
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "UNAUTHORIZED",
          message: "Service role authentication required",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const serviceRoleKey = authHeader.replace("Bearer ", "");

    // Verify service role key (simple check - in production this should be more secure)
    const expectedServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey !== expectedServiceRoleKey) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid service role key",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 3: Fetch public portfolio data
    const publicPortfolio = await PortfolioService.getPublicPortfolioByUsername(
      supabaseServiceClient,
      username
    );

    // Step 4: Handle case where portfolio doesn't exist or isn't published
    if (!publicPortfolio) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "PORTFOLIO_NOT_FOUND",
          message: "Portfolio not found or not published",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 5: Return success response
    const response: ApiSuccessResponse<PublicPortfolioDto> = {
      data: publicPortfolio,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes
      },
    });

  } catch (error: any) {
    // Handle database errors (500)
    if (error.message === "DATABASE_ERROR" || error.name === "DATABASE_ERROR") {
      await logError(supabaseServiceClient, {
        message: "Database error while fetching public portfolio",
        severity: "error",
        source: "api",
        error_code: "DATABASE_ERROR",
        endpoint: "GET /api/v1/ssr/portfolios/[username]",
        route: request.url,
        request_id: requestId,
        stack: error.stack,
        context: {
          username: params.username,
        },
      });

      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INTERNAL_ERROR",
          message: "Database error occurred",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors (500)
    await logError(supabaseServiceClient, {
      message: error.message || "Unexpected error in SSR portfolios endpoint",
      severity: "error",
      source: "api",
      error_code: "INTERNAL_ERROR",
      endpoint: "GET /api/v1/ssr/portfolios/[username]",
      route: request.url,
      request_id: requestId,
      stack: error.stack,
      context: {
        username: params.username,
      },
    });

    const errorResponse: ApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        requestId,
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
