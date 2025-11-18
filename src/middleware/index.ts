import { defineMiddleware } from "astro:middleware";
import { getActionContext } from "astro:actions";
import { createClientSSR } from "@/db/supabase.client";
import { repositories } from "@/lib/repositories";

// Route patterns using glob matching
const PUBLIC_PAGE_PATTERNS = [
  "/", // Homepage
  "/signin", // Sign in page
  "/onboarding", // Onboarding flow
  "/401",
  "/403",
  "/404",
  "/429",
  "/500",
  "/503",
  "/public/**", // Public portfolio pages for development
];

const PUBLIC_API_PATTERNS = [
  "/api/v1/auth/signin",
  "/api/v1/auth/signout",
  "/api/v1/auth/callback/github",
  "/api/v1/health",
  "/api/v1/version",
  "/api/v1/public/**", // All public API endpoints
];

const PROTECTED_PATTERNS = [
  "/dashboard/**",
  "/preview/**", // Preview routes (owner-only protection handled separately)
];

// Check if a path matches any of the patterns
function matchesPattern(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith("/**")) {
      const basePattern = pattern.slice(0, -3);
      return pathname.startsWith(basePattern);
    }
    return pathname === pattern;
  });
}

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

  if (matchesPattern(url.pathname, PUBLIC_PAGE_PATTERNS) || matchesPattern(url.pathname, PUBLIC_API_PATTERNS)) {
    return next();
  }

  // Check if this is a protected API route that requires authentication
  if (url.pathname.startsWith("/api/") && !matchesPattern(url.pathname, PUBLIC_API_PATTERNS)) {
    // All API routes require authentication except explicitly public ones
    if (!user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            requestId: locals.requestId,
          },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // For protected routes, fetch user profile if authenticated
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

  // Check if this is a protected route that requires authentication
  if (matchesPattern(url.pathname, PROTECTED_PATTERNS)) {
    if (!user || !locals.user) {
      // For pages, redirect to signin (unless it's an error page)
      if (!matchesPattern(url.pathname, PUBLIC_PAGE_PATTERNS)) {
        return redirect("/signin");
      }
    }

    // Special handling for preview routes - check if user owns the preview
    if (url.pathname.startsWith("/preview/")) {
      const urlParts = url.pathname.split("/");
      if (urlParts.length >= 3) {
        const previewUsername = urlParts[2];
        if (locals.user && locals.user.username !== previewUsername) {
          // User is trying to access someone else's preview
          return new Response(
            JSON.stringify({
              error: {
                code: "FORBIDDEN",
                message: "Access denied",
                requestId: locals.requestId,
              },
            }),
            {
              status: 403,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }
    }
  }

  /**
   * In Astro, Actions are accessible as public endpoints based on the name of the action.
   * For example, the action flows.instruct_then_draft() will be accessible from /_actions/flows.instruct_then_draft.
   * This means we must use the same authorization checks that we would consider for API endpoints and on-demand rendered pages.
   */
  const { action } = getActionContext(context);

  /**
   * Check if the action was called from a client-side function (RPC)
   */
  if (action?.calledFrom === "rpc") {
    // RPC actions require authentication
    if (!user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: "Authentication required for RPC actions",
            requestId: locals.requestId,
          },
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  return next();
});
