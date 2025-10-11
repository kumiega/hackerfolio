import type { APIRoute } from "astro";
import type { ApiSuccessResponse, ApiErrorResponse, PortfolioDto } from "@/types";
import { PortfolioService } from "@/lib/services/portfolio.service";
import { AuthService } from "@/lib/services/auth.service";
import { logError } from "@/lib/error-utils";

// Disable prerendering for this API route
export const prerender = false;

/**
 * GET /api/v1/portfolios/me
 *
 * Retrieves the portfolio data for the currently authenticated user.
 * This endpoint requires user authentication and returns the user's portfolio
 * information including ID, publication status, title, description, and timestamps.
 *
 * @returns 200 - Portfolio data for authenticated user
 * @returns 401 - User not authenticated
 * @returns 404 - Portfolio not found for this user
 * @returns 500 - Internal server error
 */
export const GET: APIRoute = async (context) => {
  const { locals, request } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();

  try {
    // Step 1: Authentication check
    const authenticatedUser = await AuthService.getCurrentSession(supabase);

    // Step 2: Fetch user's portfolio
    const portfolio = await PortfolioService.getUserPortfolio(supabase, authenticatedUser.user.id);

    // Step 3: Handle case where portfolio doesn't exist
    if (!portfolio) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "PORTFOLIO_NOT_FOUND",
          message: "Portfolio not found for this user",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 4: Return success response
    const response: ApiSuccessResponse<PortfolioDto> = {
      data: portfolio,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // Handle authentication errors (401)
    if (error.message === "UNAUTHENTICATED" || error.name === "UNAUTHENTICATED") {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle profile not found errors (401)
    if (error.message === "PROFILE_NOT_FOUND" || error.name === "PROFILE_NOT_FOUND") {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "UNAUTHORIZED",
          message: "User profile not found",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle database errors (500)
    if (error.message === "DATABASE_ERROR" || error.name === "DATABASE_ERROR") {
      await logError(supabase, {
        message: "Database error while fetching user portfolio",
        severity: "error",
        source: "api",
        error_code: "DATABASE_ERROR",
        endpoint: "GET /api/v1/portfolios/me",
        route: request.url,
        request_id: requestId,
        stack: error.stack,
        context: { user_id: error.userId },
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
    await logError(supabase, {
      message: error.message || "Unexpected error in portfolios/me endpoint",
      severity: "error",
      source: "api",
      error_code: "INTERNAL_ERROR",
      endpoint: "GET /api/v1/portfolios/me",
      route: request.url,
      request_id: requestId,
      stack: error.stack,
      context: {},
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
