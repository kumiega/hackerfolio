import type { APIRoute } from "astro";
import type { ApiSuccessResponse, SectionDto, AuthSessionDto } from "@/types";
import type { SectionListQuery } from "@/lib/schemas/section.schemas";
import { SectionService } from "@/lib/services/section.service";
import { AuthService } from "@/lib/services/auth.service";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import { sectionListQuerySchema, portfolioIdSchema } from "@/lib/schemas/section.schemas";

// Disable prerendering for this API route
export const prerender = false;

/**
 * GET /api/v1/portfolios/[portfolioId]/sections
 *
 * Retrieves a paginated list of sections for a specific portfolio. This endpoint requires user authentication
 * and ensures that only the portfolio owner can access their sections. The endpoint supports sorting by
 * position, name, or created_at, and pagination with configurable page size.
 *
 * @param portfolioId - UUID of the portfolio to retrieve sections for (path parameter)
 * @param query.page - Page number for pagination (default: 1, minimum: 1)
 * @param query.per_page - Number of items per page (default: 20, maximum: 100)
 * @param query.sort - Sort field: "position", "name", or "created_at" (default: "position")
 * @param query.order - Sort order: "asc" or "desc" (default: "asc")
 * @returns 200 - Paginated list of sections with metadata
 * @returns 400 - Invalid portfolioId format or invalid query parameters
 * @returns 401 - User not authenticated
 * @returns 403 - User is not the portfolio owner (enforced by RLS)
 * @returns 404 - Portfolio not found
 * @returns 500 - Internal server error
 */
export const GET: APIRoute = async (context) => {
  const { locals, request, params, url } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();
  const portfolioId = params.portfolioId;
  let authenticatedUser: AuthSessionDto | null = null;

  try {
    // Step 1: Authentication check
    authenticatedUser = await AuthService.getCurrentSession(supabase);

    // Step 2: Validate portfolio ID parameter
    if (!portfolioId || typeof portfolioId !== "string") {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Portfolio ID is required");
    }

    const portfolioIdValidation = portfolioIdSchema.safeParse(portfolioId);
    if (!portfolioIdValidation.success) {
      return createErrorResponse("INVALID_PORTFOLIO_ID", requestId, "Invalid portfolio ID format");
    }

    // Step 3: Parse and validate query parameters
    const urlSearchParams = new URL(url).searchParams;
    const queryParams = Object.fromEntries(urlSearchParams.entries());

    const queryValidation = sectionListQuerySchema.safeParse(queryParams);
    if (!queryValidation.success) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        requestId,
        "Invalid query parameters",
        queryValidation.error.format()
      );
    }

    const query: SectionListQuery = queryValidation.data;

    // Step 4: Retrieve sections via service
    const { sections, total } = await SectionService.listSections(
      supabase,
      portfolioId,
      authenticatedUser.user.id,
      query
    );

    // Step 5: Calculate pagination metadata
    const page = query.page || 1;
    const perPage = query.per_page || 20;
    const totalPages = Math.ceil(total / perPage);

    // Step 6: Return success response with pagination metadata
    const response: ApiSuccessResponse<SectionDto[]> = {
      data: sections,
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
      },
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
      endpoint: `GET /api/v1/portfolios/${portfolioId}/sections`,
      route: request.url,
      portfolioId,
      userId: authenticatedUser?.user?.id,
    });
  }
};
