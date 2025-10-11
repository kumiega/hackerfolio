import type { APIRoute } from "astro";
import { AuthService } from "@/lib/services/auth.service";
import { logError } from "@/lib/error-utils";
import type { ApiSuccessResponse, ApiErrorResponse, AuthSessionDto } from "@/types";

// Disable prerendering for this API route
export const prerender = false;

/**
 * GET /api/v1/auth/session
 *
 * Returns the current authenticated user's session information.
 *
 * @returns 200 - Session data with user and profile information
 * @returns 401 - User not authenticated
 * @returns 404 - User profile not found (data inconsistency)
 * @returns 500 - Internal server error
 */
export const GET: APIRoute = async (context) => {
  const { locals } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();

  try {
    // Call service layer to retrieve session data
    const sessionData = await AuthService.getCurrentSession(supabase);

    // Build success response
    const response: ApiSuccessResponse<AuthSessionDto> = {
      data: sessionData,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // Handle authentication errors (401)
    if (error.message === "UNAUTHENTICATED" || error.name === "UNAUTHENTICATED") {
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

    // Handle profile not found errors (404)
    if (error.message === "PROFILE_NOT_FOUND" || error.name === "PROFILE_NOT_FOUND") {
      // Log data inconsistency to app_errors table
      await logError(supabase, {
        message: "User profile not found for authenticated user",
        severity: "error",
        source: "api",
        error_code: "PROFILE_NOT_FOUND",
        endpoint: "GET /api/v1/auth/session",
        route: "/api/v1/auth/session",
        request_id: requestId,
        context: { user_id: error.userId },
      });

      const errorResponse: ApiErrorResponse = {
        error: {
          code: "PROFILE_NOT_FOUND",
          message: "User profile not found",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors (500)
    await logError(supabase, {
      message: error.message || "Unexpected error in session endpoint",
      severity: "error",
      source: "api",
      error_code: "INTERNAL_ERROR",
      endpoint: "GET /api/v1/auth/session",
      route: "/api/v1/auth/session",
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
