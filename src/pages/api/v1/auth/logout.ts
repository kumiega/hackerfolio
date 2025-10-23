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
 * After successful logout, redirects to the login page.
 *
 * @returns 302 - Redirect to login page after successful logout
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

    // Redirect to login page after successful logout
    return Response.redirect(`${new URL(context.url).origin}/login`, 302);
  } catch (error: unknown) {
    // Type guard for error
    const isError = error instanceof Error;
    const errorMessage = isError ? error.message : "Unexpected error in logout endpoint";
    const errorStack = isError ? error.stack : undefined;

    // Handle authentication errors (401)
    if (errorMessage === "UNAUTHENTICATED" || (isError && error.name === "UNAUTHENTICATED")) {
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
      message: errorMessage,
      severity: "error",
      source: "api",
      error_code: "INTERNAL_ERROR",
      endpoint: "POST /api/v1/auth/logout",
      route: "/api/v1/auth/logout",
      request_id: requestId,
      stack: errorStack,
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
