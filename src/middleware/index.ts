import type { MiddlewareHandler } from "astro";
import { createServerClient } from "@supabase/ssr";
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY } from "astro:env/client";
import type { Database } from "@/db/database.types";

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
        // Set cookies in the response
        cookiesToSet.forEach(({ name, value, options }) => {
          context.cookies.set(name, value, options);
        });
      },
    },
  });

  // Add Supabase client to locals for server-side access
  context.locals.supabase = supabase;

  const response = await next();
  return response;
};
