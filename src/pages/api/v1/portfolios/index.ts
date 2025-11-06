import type { APIRoute } from "astro";
import type { ApiSuccessResponse, ApiErrorResponse, PortfolioDto, PortfolioData } from "@/types";
import { repositories } from "@/lib/repositories";
import { logError } from "@/lib/error-utils";
import { z } from "zod";

// Disable prerendering for this API route
export const prerender = false;

const createPortfolioSchema = z.object({
  draft_data: z
    .object({
      full_name: z.string(),
      position: z.string(),
      bio: z.array(z.any()),
      avatar_url: z.string().nullable(),
      sections: z.array(z.any()),
    })
    .optional(),
});

/**
 * POST /api/v1/portfolios
 *
 * Creates a new portfolio for the authenticated user.
 *
 * @returns 201 - Created portfolio data
 * @returns 400 - Invalid request data
 * @returns 401 - User not authenticated
 * @returns 409 - User already has a portfolio
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async (context) => {
  const { locals, request } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();

  try {
    // Step 1: Authentication check
    if (!locals.user) {
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

    // Step 2: Parse and validate request body
    let requestData;
    try {
      requestData = await request.json();
    } catch {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "BAD_REQUEST",
          message: "Invalid JSON in request body",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validationResult = createPortfolioSchema.safeParse(requestData);
    if (!validationResult.success) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid portfolio data",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 3: Check if user already has a portfolio
    const existingPortfolio = await repositories.portfolios.findByUserId(locals.user.user_id);

    if (existingPortfolio) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "CONFLICT",
          message: "User already has a portfolio",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 4: Create new portfolio
    const createData: { user_id: string; draft_data?: PortfolioData } = {
      user_id: locals.user.user_id,
    };
    if (validationResult.data.draft_data) {
      createData.draft_data = validationResult.data.draft_data;
    }
    const newPortfolio = await repositories.portfolios.create(createData);

    // Step 5: Return success response
    const response: ApiSuccessResponse<PortfolioDto> = {
      data: newPortfolio,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
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
        context: { user_id: locals.user?.user_id },
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
