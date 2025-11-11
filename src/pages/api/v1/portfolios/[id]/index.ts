import type { APIRoute } from "astro";
import type { ApiSuccessResponse, PortfolioDto, UpdatePortfolioCommand } from "@/types";
import { z } from "zod";
import { PortfolioService } from "@/lib/services/portfolio.service";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";

// Disable prerendering for this API route
export const prerender = false;

/**
 * Zod schema for portfolio update validation (draft_data)
 * Validates the JSONB structure with sections and components
 */
const componentTypeSchema = z.enum([
  "text",
  "cards",
  "pills",
  "social_links",
  "list",
  "image",
  "bio",
  "full_name",
  "avatar",
]);

const componentSchema = z.object({
  id: z.string().min(1), // Allow any non-empty string for IDs
  type: componentTypeSchema,
  data: z.object({}).catchall(z.unknown()), // Allow any object structure for component data
  visible: z.boolean().optional(), // Optional for backward compatibility
});

const sectionSchema = z.object({
  id: z.string().min(1), // Allow any non-empty string for IDs
  title: z.string().min(1).max(150),
  slug: z.string(), // Allow empty slugs for now
  description: z.string(), // Allow empty descriptions for now
  visible: z.boolean().optional().default(true), // Make optional with default
  components: z.array(componentSchema),
});

const socialLinksSchema = z.object({
  github: z.string().optional(),
  linkedin: z.string().optional(),
  x: z.string().optional(),
  email: z.string().optional(),
  custom_link: z
    .object({
      name: z.string(),
      url: z.string(),
    })
    .optional(),
  website: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
      })
    )
    .optional(),
});

const bioDataSchema = z.object({
  full_name: z.string().max(100),
  position: z.string().max(100).optional(),
  summary: z.string().max(2000),
  avatar_url: z.string().optional(),
  social_links: socialLinksSchema.optional(),
});

const updatePortfolioSchema = z.object({
  draft_data: z.object({
    bio: bioDataSchema.optional(),
    sections: z.array(sectionSchema).max(10, "Maximum 10 sections allowed").optional(),
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

  try {
    // Step 1: Authentication check
    if (!locals.user) {
      return createErrorResponse("UNAUTHENTICATED", requestId);
    }

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

    const command: UpdatePortfolioCommand = validationResult.data as UpdatePortfolioCommand;

    // Step 4: Update portfolio via service (includes limit validation)
    const updatedPortfolio = await PortfolioService.updatePortfolio(portfolioId, locals.user.user_id, command);

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
      userId: locals.user?.user_id,
    });
  }
};
