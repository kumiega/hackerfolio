import type { APIRoute } from "astro";
import type { ApiSuccessResponse, ApiErrorResponse, PortfolioDto, CreatePortfolioCommand } from "@/types";
import { z } from "zod";
import { PortfolioService } from "@/lib/services/portfolio.service";
import { AuthService } from "@/lib/services/auth.service";
import { logError } from "@/lib/error-utils";

// Disable prerendering for this API route
export const prerender = false;

/**
 * Zod schema for portfolio creation validation
 */
const createPortfolioSchema = z.object({
  draft_data: z.object({
    sections: z.array(z.any()).optional(),
  }).optional(),
});

/**
 * POST /api/v1/portfolios
 *
 * Creates a new portfolio for the currently authenticated user.
 * This endpoint enforces a strict 1:1 relationship between users and portfolios,
 * ensuring each user can have only one portfolio. The endpoint validates input data,
 * checks for existing portfolios, and returns the created portfolio object upon successful creation.
 *
 * @param request.body - Portfolio creation data (title required, description optional)
 * @returns 201 - Created portfolio data
 * @returns 401 - User not authenticated
 * @returns 409 - Portfolio already exists for this user
 * @returns 422 - Validation errors
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async (context) => {
  const { locals, request } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();

  try {
    // Step 1: Authentication check
    const authenticatedUser = await AuthService.getCurrentSession(supabase);

    // Step 2: Parse and validate request body
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

    const validationResult = createPortfolioSchema.safeParse(requestBody);
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

    const command: CreatePortfolioCommand = validationResult.data;

    // Step 3: Check if portfolio already exists
    const portfolioExists = await PortfolioService.checkPortfolioExists(supabase, authenticatedUser.user.id);
    if (portfolioExists) {
      throw new Error("PORTFOLIO_ALREADY_EXISTS");
    }

    // Step 4: Create portfolio via service
    const createdPortfolio = await PortfolioService.createPortfolio(supabase, authenticatedUser.user.id, command);

    // Step 5: Return success response
    const response: ApiSuccessResponse<PortfolioDto> = {
      data: createdPortfolio,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
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

    // Handle portfolio already exists error (409)
    if (error.message === "PORTFOLIO_ALREADY_EXISTS" || error.name === "PORTFOLIO_ALREADY_EXISTS") {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "PORTFOLIO_ALREADY_EXISTS",
          message: "A portfolio already exists for this user",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 409,
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
        message: "Database error while creating portfolio",
        severity: "error",
        source: "api",
        error_code: "DATABASE_ERROR",
        endpoint: "POST /api/v1/portfolios",
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
      message: error.message || "Unexpected error in portfolios create endpoint",
      severity: "error",
      source: "api",
      error_code: "INTERNAL_ERROR",
      endpoint: "POST /api/v1/portfolios",
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
