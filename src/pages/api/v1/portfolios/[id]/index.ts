import type { APIRoute } from "astro";
import type { ApiSuccessResponse, PortfolioDto, UpdatePortfolioCommand, AuthSessionDto } from "@/types";
import { z } from "zod";
import { PortfolioService } from "@/lib/services/portfolio.service";
import { AuthService } from "@/lib/services/auth.service";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";

// Disable prerendering for this API route
export const prerender = false;

/**
 * Zod schema for portfolio update validation (draft_data)
 * Validates the JSONB structure with sections and components
 */
const componentSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["text", "card", "pills", "social_links", "list", "image", "bio"]),
  data: z.record(z.any()),
});

const sectionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(150),
  slug: z.string(),
  description: z.string(),
  visible: z.boolean(),
  components: z.array(componentSchema),
});

const updatePortfolioSchema = z.object({
  draft_data: z.object({
    sections: z.array(sectionSchema).max(10, "Maximum 10 sections allowed"),
  }),
});

/**
 * PATCH /api/v1/portfolios/[id]
 *
 * Updates portfolio draft_data with sections and components. This endpoint requires user authentication
 * and ensures that only the portfolio owner can make updates. Validates JSONB structure and enforces
 * limits (max 10 sections, max 15 components total).
 *
 * @param request.body - Portfolio update data with draft_data
 * @returns 200 - Updated portfolio data
 * @returns 401 - User not authenticated
 * @returns 403 - User is not the portfolio owner
 * @returns 404 - Portfolio not found
 * @returns 409 - Exceeds limits (sections or components)
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

    // Step 4: Update portfolio via service (includes limit validation)
    const updatedPortfolio = await PortfolioService.updatePortfolio(portfolioId, authenticatedUser.user.id, command);

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
