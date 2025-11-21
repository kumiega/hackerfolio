import type { APIRoute } from "astro";
import type { ApiSuccessResponse, PublicPortfolioDto } from "@/types";
import { PortfolioService } from "@/lib/services/portfolio.service";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_INTERNAL_URL = import.meta.env.SUPABASE_INTERNAL_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Disable prerendering for this API route
export const prerender = false;

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
 * GET /api/v1/public/portfolios/:username
 *
 * Retrieves a published portfolio by username for server-side rendering (SSR).
 * This endpoint uses the service role client to bypass RLS and read published_data.
 * Only portfolios that have been published (published_data is not NULL) are accessible.
 *
 * This endpoint is intended for SSR use by the public portfolio subdomain pages.
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
      endpoint: "GET /api/v1/public/portfolios/:username",
      route: request.url,
    });
  }
};
