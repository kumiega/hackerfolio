import type { APIRoute } from "astro";
import { createClientSSR } from "@/db/supabase.client";

/**
 * POST /api/v1/auth/logout
 *
 * Handles user logout by signing out the user session.
 * This endpoint requires user authentication and clears the user's session.
 * After successful logout, redirects to the login page.
 *
 * @returns 302 - Redirect to login page after successful logout
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const supabase = createClientSSR({ request, cookies });

  const { error } = await supabase.auth.signOut();

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  return redirect("/signin");
};
