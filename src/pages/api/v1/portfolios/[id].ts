import type { APIRoute } from "astro";
import type { ApiSuccessResponse, ApiErrorResponse, PortfolioDto, UpdatePortfolioCommand } from "@/types";
import { z } from "zod";
import { PortfolioService } from "@/lib/services/portfolio.service";
import { AuthService } from "@/lib/services/auth.service";
import { logError } from "@/lib/error-utils";

// Disable prerendering for this API route
export const prerender = false;

/**
 * Zod schema for portfolio update validation
 */
const updatePortfolioSchema = z.object({
  title: z.string().min(1).max(100).trim(),
  description: z.string().nullable().optional(),
});

/**
 * PATCH /api/v1/portfolios/[id]
 *
 * Updates mutable fields of an existing portfolio. This endpoint requires user authentication
 * and ensures that only the portfolio owner can make updates. The endpoint validates input data
 * and returns the updated portfolio object upon successful update.
 *
 * @param request.body - Portfolio update data (title required, description optional)
 * @returns 200 - Updated portfolio data
 * @returns 401 - User not authenticated
 * @returns 403 - User is not the portfolio owner
 * @returns 404 - Portfolio not found
 * @returns 422 - Validation errors
 * @returns 500 - Internal server error
 */
export const PATCH: APIRoute = async (context) => {
  const { locals, request, params } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();
  const portfolioId = params.id;

  try {
    // Step 1: Authentication check
    const authenticatedUser = await AuthService.getCurrentSession(supabase);

    // Step 2: Validate portfolio ID parameter
    if (!portfolioId || typeof portfolioId !== "string") {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid portfolio ID",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 3: Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON in request body",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validationResult = updatePortfolioSchema.safeParse(requestBody);
    if (!validationResult.success) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input data",
          details: validationResult.error.format(),
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }

    const command: UpdatePortfolioCommand = validationResult.data;

    // Step 4: Update portfolio via service
    const updatedPortfolio = await PortfolioService.updatePortfolio(
      supabase,
      portfolioId,
      authenticatedUser.user.id,
      command
    );

    // Step 5: Return success response
    const response: ApiSuccessResponse<PortfolioDto> = {
      data: updatedPortfolio,
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

    // Handle portfolio not found error (404)
    if (error.message === "PORTFOLIO_NOT_FOUND" || error.name === "PORTFOLIO_NOT_FOUND") {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "PORTFOLIO_NOT_FOUND",
          message: "Portfolio not found or access denied",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle validation errors (422)
    if (error.message === "VALIDATION_ERROR" || error.name === "VALIDATION_ERROR") {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input data",
          details: error.details,
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle database errors (500)
    if (error.message === "DATABASE_ERROR" || error.name === "DATABASE_ERROR") {
      await logError(supabase, {
        message: "Database error while updating portfolio",
        severity: "error",
        source: "api",
        error_code: "DATABASE_ERROR",
        endpoint: `PATCH /api/v1/portfolios/${portfolioId}`,
        route: request.url,
        request_id: requestId,
        stack: error.stack,
        context: {
          user_id: error.userId,
          portfolio_id: portfolioId,
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
    await logError(supabase, {
      message: error.message || "Unexpected error in portfolios update endpoint",
      severity: "error",
      source: "api",
      error_code: "INTERNAL_ERROR",
      endpoint: `PATCH /api/v1/portfolios/${portfolioId}`,
      route: request.url,
      request_id: requestId,
      stack: error.stack,
      context: {
        portfolio_id: portfolioId,
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
