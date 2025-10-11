import type { APIRoute } from "astro";
import { z } from "zod";
import { AuthService } from "@/lib/services/auth.service";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import type { ApiSuccessResponse, UserProfileDto, ClaimUsernameCommand } from "@/types";

// Disable prerendering for this API route
export const prerender = false;

/**
 * Zod schema for validating claim username request
 */
const ClaimUsernameSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-z0-9-]+$/, "Username must contain only lowercase letters, numbers, and hyphens"),
});

/**
 * POST /api/v1/auth/claim-username
 *
 * Allows authenticated users to claim a unique username that becomes their permanent identifier.
 * The username can only be set once and cannot be changed afterward.
 *
 * Request Body:
 * - username: string - Username to claim (must match ^[a-z0-9-]{3,30}$ pattern)
 *
 * @returns 200 - Successfully claimed username with updated profile
 * @returns 400 - Invalid username format or malformed request
 * @returns 401 - User not authenticated
 * @returns 409 - Username already taken or user already has username set
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async (context) => {
  const { locals, request } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();

  try {
    // Step 1: Parse and validate request body using Zod schema
    let requestBody: ClaimUsernameCommand;

    try {
      const rawBody = await request.json();
      requestBody = ClaimUsernameSchema.parse(rawBody);
    } catch (parseError) {
      // Handle both JSON parsing errors and Zod validation errors
      if (parseError instanceof z.ZodError) {
        return createErrorResponse(
          "INVALID_USERNAME_FORMAT",
          requestId,
          parseError.issues[0]?.message || "Invalid request data"
        );
      }
      return createErrorResponse("VALIDATION_ERROR", requestId, "Request body must be valid JSON");
    }

    // Step 2: Claim username via AuthService
    const updatedProfile = await AuthService.claimUsername(supabase, requestBody.username);

    // Step 3: Build and return success response
    const response: ApiSuccessResponse<UserProfileDto> = {
      data: updatedProfile,
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
      endpoint: "POST /api/v1/auth/claim-username",
      route: request.url,
    });
  }
};
