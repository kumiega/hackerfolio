import type { APIRoute } from "astro";
import type { ApiSuccessResponse, ApiErrorResponse, PublishStatusDto } from "@/types";
import { PortfolioService } from "@/lib/services/portfolio.service";
import { AuthService } from "@/lib/services/auth.service";
import { logError } from "@/lib/error-utils";
import { ERROR_CODES } from "@/lib/error-constants";
import { isValidUUID } from "@/lib/utils";

// Disable prerendering for this API route
export const prerender = false;

/**
 * POST /api/v1/portfolios/:id/publish
 *
 * Publishes a portfolio if it meets the minimum requirements.
 * The portfolio must have at least one section and one component total.
 * Upon successful publication, the portfolio's is_published flag is set to true
 * and published_at timestamp is updated to the current time.
 *
 * @param id - Portfolio UUID from URL path parameter (required, valid UUID format)
 * @returns 200 - Portfolio successfully published with updated status
 * @returns 400 - Invalid portfolio ID format or request body provided
 * @returns 401 - User not authenticated or profile not found
 * @returns 404 - Portfolio does not exist or user does not own it
 * @returns 409 - Portfolio does not meet publication requirements (missing sections/components)
 * @returns 500 - Internal server error
 *
 * Test Scenarios:
 * - 200: Valid authenticated request with eligible portfolio → publishes successfully
 * - 400: Invalid UUID format in path parameter → returns validation error
 * - 400: Request body provided (should be empty) → returns validation error
 * - 401: No authentication token → returns unauthorized
 * - 401: Invalid/expired token → returns unauthorized
 * - 404: Non-existent portfolio ID → returns not found
 * - 404: Portfolio belongs to different user → returns not found
 * - 409: Portfolio has no sections → returns unmet requirements
 * - 409: Portfolio has sections but no components → returns unmet requirements
 * - 409: Portfolio already published → should succeed (idempotent)
 * - 500: Database connection error → returns internal error
 */
export const POST: APIRoute = async (context) => {
  const { locals, request, params } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();

  // Step 1: Extract and validate path parameters
  const portfolioId = params.id;

  try {
    if (!portfolioId || typeof portfolioId !== "string" || !isValidUUID(portfolioId)) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: ERROR_CODES.INVALID_PORTFOLIO_ID,
          message: "Portfolio ID is required and must be a valid UUID",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 2: Validate request body (should be empty)
    try {
      const body = await request.text();
      if (body.trim()) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: "Request body must be empty",
            requestId,
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch {
      // If reading the body fails, continue (some request types might not have readable bodies)
    }

    // Step 3: Authentication check
    const authenticatedUser = await AuthService.getCurrentSession(supabase);

    // Step 4: Publish portfolio
    const publishStatus = await PortfolioService.publishPortfolio(supabase, portfolioId, authenticatedUser.user.id);

    // Step 5: Return success response
    const response: ApiSuccessResponse<PublishStatusDto> = {
      data: publishStatus,
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
    if (error.message === ERROR_CODES.UNAUTHENTICATED || error.name === ERROR_CODES.UNAUTHENTICATED) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
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
    if (error.message === ERROR_CODES.PROFILE_NOT_FOUND || error.name === ERROR_CODES.PROFILE_NOT_FOUND) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: "User profile not found",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle portfolio not found or ownership errors (403/404)
    if (error.message === ERROR_CODES.PORTFOLIO_NOT_FOUND || error.name === ERROR_CODES.PORTFOLIO_NOT_FOUND) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: ERROR_CODES.PORTFOLIO_NOT_FOUND,
          message: "Portfolio not found or access denied",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unmet requirements error (409)
    if (error.message === ERROR_CODES.UNMET_REQUIREMENTS || error.name === ERROR_CODES.UNMET_REQUIREMENTS) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: ERROR_CODES.UNMET_REQUIREMENTS,
          message: "Portfolio must have at least one section and one component to be published",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle database errors (500)
    if (error.message === ERROR_CODES.DATABASE_ERROR || error.name === ERROR_CODES.DATABASE_ERROR) {
      await logError(supabase, {
        message: "Database error while publishing portfolio",
        severity: "error",
        source: "api",
        error_code: ERROR_CODES.DATABASE_ERROR,
        endpoint: "POST /api/v1/portfolios/[id]/publish",
        route: request.url,
        request_id: requestId,
        stack: error.stack,
        context: { user_id: error.userId, portfolio_id: portfolioId },
        portfolio_id: portfolioId,
      });

      const errorResponse: ApiErrorResponse = {
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
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
      message: error.message || "Unexpected error in portfolios publish endpoint",
      severity: "error",
      source: "api",
      error_code: ERROR_CODES.INTERNAL_ERROR,
      endpoint: "POST /api/v1/portfolios/[id]/publish",
      route: request.url,
      request_id: requestId,
      stack: error.stack,
      context: { portfolio_id: portfolioId },
      portfolio_id: portfolioId,
    });

    const errorResponse: ApiErrorResponse = {
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
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
