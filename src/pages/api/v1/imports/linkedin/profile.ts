import type { APIRoute } from "astro";
import type { PortfolioData } from "@/types";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import { OpenRouterService } from "@/lib/services/open-router.service";
import { PortfolioService } from "@/lib/services/portfolio.service";
import { linkedinAuthCommandSchema } from "@/lib/schemas/linkedin.schemas";

// Disable prerendering for this API route
export const prerender = false;

/**
 * POST /api/v1/imports/linkedin/profile
 *
 * Generates complete portfolio data from manually entered LinkedIn data using AI.
 * Creates a full portfolio structure and saves it as draft_data for the user.
 *
 * The endpoint requires user authentication and saves the generated portfol  io as draft data.
 * It returns the generated portfolio data.
 *
 * @param body - LinkedIn form data (fullName, position, summary, experience)
 * @returns 200 - Generated portfolio data
 * @returns 401 - User not authenticated
 * @returns 422 - Invalid input data or validation errors
 * @returns 429 - AI model rate limit exceeded
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async (context) => {
  const { locals, request } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();

  try {
    // Step 1: Authentication check
    if (!locals.user) {
      return createErrorResponse("UNAUTHENTICATED", requestId);
    }

    // Step 2: Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return createErrorResponse("INVALID_JSON", requestId);
    }

    // Step 3: Validate request data using Zod schema
    const validation = linkedinAuthCommandSchema.safeParse(requestBody);
    if (!validation.success) {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Invalid request data", {
        issues: validation.error.issues,
      });
    }

    const formData = validation.data;

    // Step 4: Generate portfolio data using AI
    let portfolioData: PortfolioData;
    try {
      portfolioData = await OpenRouterService.generatePortfolioFromLinkedIn(formData);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("rate limit")) {
          return createErrorResponse(
            "RATE_LIMIT_EXCEEDED",
            requestId,
            "AI service rate limit exceeded. Please try again later."
          );
        }
        if (error.message.includes("timeout")) {
          return createErrorResponse("AI_TIMEOUT", requestId, "AI service timeout. Please try again.");
        }
        if (error.message.includes("unavailable")) {
          return createErrorResponse("AI_UNAVAILABLE", requestId, "AI service unavailable. Please try again later.");
        }
      }
      throw error; // Re-throw for general error handling
    }

    // Step 5: Save generated portfolio data as draft data
    try {
      // Check if user already has a portfolio
      const existingPortfolio = await PortfolioService.getUserPortfolio(locals.user.user_id);

      if (existingPortfolio) {
        // Update existing portfolio
        await PortfolioService.updatePortfolio(existingPortfolio.id, locals.user.user_id, {
          draft_data: portfolioData,
        });
      } else {
        // Create new portfolio
        await PortfolioService.createPortfolio(locals.user.user_id, {
          draft_data: portfolioData,
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      return createErrorResponse("DATABASE_ERROR", requestId, "Failed to save portfolio data");
    }

    // Step 6: Return success response with generated portfolio data
    return new Response(JSON.stringify({ data: portfolioData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleApiError(error, {
      supabase,
      requestId,
      endpoint: "POST /api/v1/imports/linkedin/profile",
      route: request.url,
      userId: locals.user?.user_id,
    });
  }
};
