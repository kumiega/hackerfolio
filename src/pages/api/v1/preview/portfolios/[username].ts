import type { APIRoute } from "astro";
import type { ApiSuccessResponse, PreviewPortfolioDto } from "@/types";
import { PortfolioService } from "@/lib/services/portfolio.service";
import { createErrorResponse, handleApiError } from "@/lib/error-handler";

// Disable prerendering for this API route
export const prerender = false;

/**
 * GET /api/v1/preview/portfolios/:username
 *
 * Retrieves a draft portfolio (draft_data) by username for preview purposes.
 * This endpoint requires authentication and only allows the portfolio owner to view their draft.
 *
 * This endpoint is intended for the preview functionality where users can see their
 * unpublished changes before publishing.
 *
 * @param username - Username from URL path parameter
 * @returns 200 - Draft portfolio data
 * @returns 401 - User not authenticated
 * @returns 403 - User is not the portfolio owner
 * @returns 404 - Portfolio not found
 * @returns 500 - Internal server error
 */
export const GET: APIRoute = async (context) => {
  const { locals, params, request } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();
  const username = params.username;

  try {
    // Step 1: Authentication check
    if (!locals.user) {
      return createErrorResponse("UNAUTHENTICATED", requestId);
    }

    // Step 2: Validate username parameter
    if (!username || typeof username !== "string") {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Invalid username");
    }

    // Step 3: Fetch preview portfolio by username (includes ownership check)
    const previewPortfolio = await PortfolioService.getPreviewPortfolioByUsername(
      supabase,
      username,
      locals.user.user_id
    );

    // Step 4: Handle not found case
    if (!previewPortfolio) {
      return createErrorResponse("PORTFOLIO_NOT_FOUND", requestId, "Portfolio not found");
    }

    // Step 5: Return success response
    const response: ApiSuccessResponse<PreviewPortfolioDto> = {
      data: previewPortfolio,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-cache", // No caching for preview (always fresh)
      },
    });
  } catch (error) {
    return handleApiError(error, {
      supabase,
      requestId,
      endpoint: "GET /api/v1/preview/portfolios/:username",
      route: request.url,
      userId: locals.user?.user_id,
    });
  }
};
