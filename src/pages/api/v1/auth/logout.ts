import type { APIRoute } from "astro";
import { AuthService } from "@/lib/services/auth.service";
import { logError } from "@/lib/error-utils";
import type { ApiErrorResponse } from "@/types";

// Disable prerendering for this API route
export const prerender = false;

/**
 * POST /api/v1/auth/logout
 *
 * Handles user logout by signing out the user session.
 * This endpoint requires user authentication and clears the user's session.
 *
 * @returns 200 - Successfully logged out
 * @returns 401 - User not authenticated
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async (context) => {
  const { locals } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();

  try {
    // Verify user is authenticated before logout
    await AuthService.getCurrentSession(supabase);

    // Sign out the user
    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      throw new Error(logoutError.message);
    }

    // Return success response
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
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

    // Handle unexpected errors (500)
    await logError(supabase, {
      message: error.message || "Unexpected error in logout endpoint",
      severity: "error",
      source: "api",
      error_code: "INTERNAL_ERROR",
      endpoint: "POST /api/v1/auth/logout",
      route: "/api/v1/auth/logout",
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
