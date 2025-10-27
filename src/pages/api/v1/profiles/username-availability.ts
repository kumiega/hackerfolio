import type { APIRoute } from "astro";
import { AuthService } from "@/lib/services/auth.service";
import { logError } from "@/lib/error-utils";
import type { ApiSuccessResponse, ApiErrorResponse, UsernameAvailabilityDto } from "@/types";

// Disable prerendering for this API route
export const prerender = false;

/**
 * Username validation regex pattern
 */
const USERNAME_REGEX = /^[a-z0-9-]{3,30}$/;

/**
 * Validates username format against requirements
 *
 * @param username - Username string to validate
 * @returns true if valid, false otherwise
 */
function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username);
}

/**
 * GET /api/v1/auth/username-availability
 *
 * Checks if a username is available for registration or profile setup.
 *
 * Query Parameters:
 * - username: string - The username to check for availability (required)
 *
 * @returns 200 - Username availability status
 * @returns 400 - Invalid username format
 * @returns 500 - Internal server error
 */
export const GET: APIRoute = async (context) => {
  const { locals, url } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();

  try {
    // Step 1: Extract and validate username query parameter
    const usernameParam = url.searchParams.get("username");

    if (!usernameParam) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "MISSING_USERNAME",
          message: "Username parameter is required",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate username format using regex
    if (!isValidUsername(usernameParam)) {
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

    // Step 2: Check username availability via AuthService
    const availabilityData = await AuthService.checkUsernameAvailability(usernameParam);

    // Step 3: Build and return success response
    const response: ApiSuccessResponse<UsernameAvailabilityDto> = {
      data: availabilityData,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // Handle unexpected errors (500)
    await logError(supabase, {
      message: error.message || "Unexpected error in username availability endpoint",
      severity: "error",
      source: "api",
      error_code: "INTERNAL_ERROR",
      endpoint: "GET /api/v1/profiles/username-availability",
      route: "/api/v1/profiles/username-availability",
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
