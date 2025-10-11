import type { APIRoute } from "astro";
import type { ApiSuccessResponse, PortfolioDto, UpdatePortfolioCommand, AuthSessionDto } from "@/types";
import { z } from "zod";
import { PortfolioService } from "@/lib/services/portfolio.service";
import { AuthService } from "@/lib/services/auth.service";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";

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
  let authenticatedUser: AuthSessionDto | null = null;

  try {
    // Step 1: Authentication check
    authenticatedUser = await AuthService.getCurrentSession(supabase);

    // Step 2: Validate portfolio ID parameter
    if (!portfolioId || typeof portfolioId !== "string") {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Invalid portfolio ID");
    }

    // Step 3: Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Invalid JSON in request body");
    }

    const validationResult = updatePortfolioSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Invalid input data", validationResult.error.format());
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
  } catch (error) {
    return handleApiError(error, {
      supabase,
      requestId,
      endpoint: `PATCH /api/v1/portfolios/${portfolioId}`,
      route: request.url,
      portfolioId,
      userId: authenticatedUser?.user?.id,
    });
  }
};
