import type { APIRoute } from "astro";
import { OpenRouterService } from "@/lib/services/open-router.service";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import { readFileSync } from "fs";
import { join } from "path";

// Read the cards description prompt
const cardsDescriptionPrompt = readFileSync(join(process.cwd(), "src/lib/prompts/cards-description.md"), "utf-8");

/**
 * POST /api/v1/ai/generate-description
 *
 * Generates a text description for the projects section using AI.
 *
 * @returns 200 - Generated description text
 * @returns 401 - User not authenticated
 * @returns 500 - AI service error
 */
export const POST: APIRoute = async (context) => {
  const { locals, request } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();

  try {
    console.log("Starting description generation...");

    // Step 1: Verify authentication (basic check)
    const {
      data: { user },
    } = await locals.supabase.auth.getUser();

    if (!user) {
      console.log("No authenticated user found");
      return createErrorResponse("UNAUTHENTICATED", requestId);
    }

    console.log("User authenticated, checking request body...");

    // Step 2: Validate request body (should be empty for this endpoint)
    if (request.method === "POST" && request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.text();
      if (body && body.trim()) {
        // If body is provided, it should be empty or just {}
        try {
          const parsed = JSON.parse(body);
          if (Object.keys(parsed).length > 0) {
            return createErrorResponse("VALIDATION_ERROR", requestId, "Request body should be empty");
          }
        } catch {
          return createErrorResponse("VALIDATION_ERROR", requestId, "Invalid JSON in request body");
        }
      }
    }

    console.log("Request body validated, generating description...");

    // Step 3: Generate description using OpenRouter
    let description: string;
    try {
      console.log("Starting AI description generation...");
      description = await OpenRouterService.generateDescription(cardsDescriptionPrompt);
      console.log("AI description generation completed successfully");
    } catch (error) {
      console.log("AI description generation error:", error);
      if (error instanceof Error) {
        console.log("Error message:", error.message);
        console.log("Error stack:", error.stack);
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
        if (error.message.includes("configuration missing") || error.message.includes("API key")) {
          return createErrorResponse("AI_CONFIG_ERROR", requestId, "AI service configuration error.");
        }
      }
      // For any other error, return a generic message but log the details
      console.error("Unhandled error in AI generation:", error);
      return createErrorResponse("AI_ERROR", requestId, "AI service error. Please try again.");
    }

    // Step 4: Return the generated description
    return new Response(
      JSON.stringify({
        data: {
          description: description,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in generate-description API:", error);

    // For OpenRouter errors, return a more specific error response
    if (error instanceof Error) {
      if (error.message.includes("AI service configuration missing") || error.message.includes("API key")) {
        return createErrorResponse(
          "AI_CONFIG_ERROR",
          requestId,
          "AI service configuration error. Please check your API key."
        );
      }
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

    return handleApiError(error, {
      supabase,
      requestId,
      endpoint: "POST /api/v1/ai/generate-description",
      route: request.url,
      userId: locals.user?.user_id,
    });
  }
};
