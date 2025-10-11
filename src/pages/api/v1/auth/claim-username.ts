import type { APIRoute } from "astro";
import { z } from "zod";
import { AuthService } from "@/lib/services/auth.service";
import { logError } from "@/lib/error-utils";
import type { ApiSuccessResponse, ApiErrorResponse, UserProfileDto, ClaimUsernameCommand } from "@/types";

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
      let errorMessage = "Request body must be valid JSON";
      let errorCode = "INVALID_JSON";

      if (parseError instanceof z.ZodError) {
        errorMessage = parseError.issues[0]?.message || "Invalid request data";
        errorCode = "INVALID_USERNAME_FORMAT";
      }

      const errorResponse: ApiErrorResponse = {
        error: {
          code: errorCode,
          message: errorMessage,
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // Handle specific AuthError types with appropriate HTTP status codes
    if (error.name === "UNAUTHENTICATED") {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error.name === "INVALID_USERNAME_FORMAT") {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_USERNAME_FORMAT",
          message: "Username must be 3-30 characters, lowercase letters, numbers, and hyphens only",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error.name === "USERNAME_ALREADY_SET") {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "USERNAME_ALREADY_SET",
          message: "Username has already been set for this account",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error.name === "USERNAME_TAKEN") {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "USERNAME_TAKEN",
          message: "This username is already taken",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error.name === "PROFILE_NOT_FOUND") {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "PROFILE_NOT_FOUND",
          message: "User profile not found",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors (500)
    await logError(supabase, {
      message: error.message || "Unexpected error in claim username endpoint",
      severity: "error",
      source: "api",
      error_code: "INTERNAL_ERROR",
      endpoint: "POST /api/v1/auth/claim-username",
      route: "/api/v1/auth/claim-username",
      request_id: requestId,
      stack: error.stack,
      context: {},
    });

    const errorResponse: ApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        requestId,
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
