import type { APIRoute } from "astro";
import type { ApiSuccessResponse, PortfolioDto, PublicPortfolioDto, UpdatePortfolioCommand } from "@/types";
import { z } from "zod";
import { PortfolioService } from "@/lib/services/portfolio.service";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_INTERNAL_URL = import.meta.env.SUPABASE_INTERNAL_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

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
  "personal_info",
  "avatar",
]);

// Component data schemas
const textComponentDataSchema = z.object({
  content: z.string().max(2000),
});

const pillsComponentDataSchema = z.object({
  items: z.array(z.string().max(20)).max(30),
});

const componentDataSchema = z.union([
  textComponentDataSchema,
  pillsComponentDataSchema,
  z.object({}).catchall(z.unknown()), // Fallback for other component types
]);

const componentSchema = z.object({
  id: z.string().min(1), // Allow any non-empty string for IDs
  type: componentTypeSchema,
  data: componentDataSchema,
  visible: z.boolean().optional(), // Optional for backward compatibility
});

const sectionSchema = z.object({
  id: z.string().min(1), // Allow any non-empty string for IDs
  title: z.string().min(1).max(150),
  slug: z.string().min(1), // Slug must be non-empty
  visible: z.boolean(), // Required boolean
  components: z.array(componentSchema).min(1), // At least 1 component required
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
  avatar_url: z.string(),
  social_links: socialLinksSchema,
});

const updatePortfolioSchema = z.object({
  draft_data: z.object({
    bio: bioDataSchema.optional(),
    sections: z.array(sectionSchema).max(10, "Maximum 10 sections allowed").optional(),
  }),
});

/**
 * Create service role client for server-side operations that need to bypass RLS
 * This client has full access to all data and should only be used for specific server operations
 */
const createClientService = () => {
  return createClient(SUPABASE_INTERNAL_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

/**
 * GET /api/v1/portfolios/:username
 *
 * Retrieves a published portfolio by username for server-side rendering (SSR).
 * This endpoint uses the service role client to bypass RLS and read published_data.
 * Only portfolios that have been published (published_data is not NULL) are accessible.
 *
 * This endpoint is intended for SSR use by the public portfolio pages.
 *
 * @param username - Username from URL path parameter
 * @returns 200 - Published portfolio data
 * @returns 404 - Portfolio not found or not published
 * @returns 500 - Internal server error
 */
export const GET: APIRoute = async (context) => {
  const { params, request } = context;
  const requestId = crypto.randomUUID();
  const username = params.username;

  // Create service role client (bypasses RLS)
  const supabaseService = createClientService();

  try {
    if (!username || typeof username !== "string") {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Invalid username");
    }

    const publicPortfolio = await PortfolioService.getPublicPortfolioByUsername(supabaseService, username);

    if (!publicPortfolio) {
      return createErrorResponse("PORTFOLIO_NOT_FOUND", requestId, "Portfolio not found or not published");
    }

    const response: ApiSuccessResponse<PublicPortfolioDto> = {
      data: publicPortfolio,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300", // Cache for 1 min, serve stale for 5 min
      },
    });
  } catch (error) {
    return handleApiError(error, {
      supabase: supabaseService,
      requestId,
      endpoint: "GET /api/v1/portfolios/:username",
      route: request.url,
    });
  }
};

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
