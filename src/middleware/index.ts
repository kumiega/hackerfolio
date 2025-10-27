import type { MiddlewareHandler } from "astro";
import { createServerClient } from "@supabase/ssr";
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY } from "astro:env/client";
import type { Database } from "@/db/database.types";
import { repositories } from "@/lib/repositories";

export const onRequest: MiddlewareHandler = async (context, next) => {
  // Generate unique request ID for tracking and error logging
  context.locals.requestId = crypto.randomUUID();

  // Create server-side Supabase client with proper SSR cookie handling
  const supabase = createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY, {
    cookies: {
      getAll() {
        // Parse all cookies from the request
        const cookieHeader = context.request.headers.get("cookie");
        if (!cookieHeader) return [];

        return cookieHeader.split(";").map((cookie) => {
          const [name, ...rest] = cookie.trim().split("=");
          return {
            name,
            value: rest.join("="), // Handle values that contain '='
          };
        });
      },
      setAll(cookiesToSet) {
        // Set cookies in the response - only if response hasn't been sent yet
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            context.cookies.set(name, value, options);
          } catch (error) {
            // Handle ResponseSentError specifically - this happens when Supabase tries to
            // update cookies asynchronously after the response has been sent (e.g., token refresh)
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes("ResponseSentError") || errorMessage.includes("response has already been sent")) {
              // Silently ignore - this is expected behavior in SSR when auth operations
              // complete after the response has been sent
              return;
            }

            // For other cookie errors, log them but don't fail the request
            console.warn("Failed to set cookie:", error);
          }
        });
      },
    },
  });

  // Add Supabase client to locals for server-side access
  context.locals.supabase = supabase;

  // Initialize repository locator with the Supabase client
  repositories.initialize(supabase);

  const response = await next();
  return response;
};
