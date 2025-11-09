import { defineMiddleware } from "astro:middleware";
import { getActionContext } from "astro:actions";
import { createClientSSR } from "@/db/supabase.client";
import { repositories } from "@/lib/repositories";

export const onRequest = defineMiddleware(async (context, next) => {
  const { locals, redirect, url } = context;

  const supabase = createClientSSR({
    request: context.request,
    cookies: context.cookies,
  });

  repositories.initialize(supabase);
  locals.supabase = supabase;
  locals.requestId = crypto.randomUUID();

  /**
   * Do not run code between createServerClient and supabase.auth.getUser(). A simple mistake could make it very hard to debug issues with users being randomly logged out.
   *
   * IMPORTANT: DO NOT REMOVE auth.getUser()
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Routes that are public but should check for user (homepage, etc.)
  const publicWithOptionalAuth = ["/"];

  // Routes that are completely public (signin, callback)
  const publicNoAuth = ["/signin", "/api/v1/auth/signin", "/api/v1/auth/callback/github"];

  // For completely public routes, skip user fetching
  if (publicNoAuth.includes(url.pathname)) {
    return next();
  }

  // For all other routes (including publicWithOptionalAuth), fetch user if exists
  if (user) {
    const profile = await repositories.userProfiles.findById(user.id);

    if (profile) {
      // Get avatar URL from user metadata (GitHub OAuth)
      const avatarUrl =
        user.user_metadata?.avatar_url && user.user_metadata?.avatar_url.trim() !== ""
          ? user.user_metadata?.avatar_url
          : null;

      locals.user = {
        user_id: user.id,
        profile_id: profile.id || "",
        email: user.email || "",
        username: profile.username,
        avatar_url: avatarUrl,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        is_onboarded: profile.is_onboarded,
      };
    }
  }

  // If it's a public route with optional auth, continue
  if (publicWithOptionalAuth.includes(url.pathname)) {
    return next();
  }

  // Protected routes - require authentication
  if (!user || !locals.user) {
    if (url.pathname.startsWith("/api")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return redirect("/signin");
  }

  /**
   * In Astro, Actions are accessible as public endpoints based on the name of the action.
   * For example, the action  flows.instruct_then_draft() will be accessible from /_actions/flows.instruct_then_draft.
   * This means we must use the same authorization checks that we would consider for API endpoints and on-demand rendered pages.
   */
  const { action } = getActionContext(context);

  /**
   * Check if the action was called from a client-side function
   */
  if (action?.calledFrom === "rpc") {
    // If so, check for a user session token, and if necessary, block the request
    if (!user) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  return next();
});
