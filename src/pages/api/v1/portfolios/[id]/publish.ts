import type { APIRoute } from "astro";
import type { ApiSuccessResponse, PublishStatusDto, AuthSessionDto } from "@/types";
import { PortfolioService } from "@/lib/services/portfolio.service";
import { AuthService } from "@/lib/services/auth.service";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import { ERROR_CODES } from "@/lib/error-constants";
import { isValidUUID } from "@/lib/utils";

// Disable prerendering for this API route
export const prerender = false;

/**
 * POST /api/v1/portfolios/:id/publish
 *
 * Publishes a portfolio by copying draft_data to published_data.
 * The database function validates that draft_data has at least one section and one component.
 * Upon successful publication, published_data is updated and last_published_at timestamp is set.
 *
 * @param id - Portfolio UUID from URL path parameter (required, valid UUID format)
 * @returns 200 - Portfolio successfully published with published_data
 * @returns 400 - Invalid portfolio ID format or request body provided
 * @returns 401 - User not authenticated or profile not found
 * @returns 404 - Portfolio does not exist or user does not own it
 * @returns 409 - Portfolio does not meet publication requirements (missing sections/components in draft_data)
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
 * - 409: draft_data has no sections → returns unmet requirements
 * - 409: draft_data has sections but no components → returns unmet requirements
 * - 500: Database connection error → returns internal error
 */
export const POST: APIRoute = async (context) => {
  const { locals, request, params } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();

  // Step 1: Extract and validate path parameters
  const portfolioId = params.id;
  let authenticatedUser: AuthSessionDto | null = null;

  try {
    if (!portfolioId || typeof portfolioId !== "string" || !isValidUUID(portfolioId)) {
      return createErrorResponse(ERROR_CODES.INVALID_PORTFOLIO_ID, requestId);
    }

    // Step 2: Validate request body (should be empty)
    try {
      const body = await request.text();
      if (body.trim()) {
        return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, requestId, "Request body must be empty");
      }
    } catch {
      // If reading the body fails, continue (some request types might not have readable bodies)
    }

    // Step 3: Authentication check
    authenticatedUser = await AuthService.getCurrentSession(supabase);

    // Step 4: Publish portfolio (calls DB function that copies draft_data to published_data)
    const publishStatus = await PortfolioService.publishPortfolio(portfolioId, authenticatedUser.user.id);

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
  } catch (error) {
    return handleApiError(error, {
      supabase,
      requestId,
      endpoint: "POST /api/v1/portfolios/[id]/publish",
      route: request.url,
      portfolioId,
      userId: authenticatedUser?.user?.id,
    });
  }
};
