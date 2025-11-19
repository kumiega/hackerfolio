import { createBrowserClient, createServerClient, parseCookieHeader } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY } from "astro:env/client";

const SUPABASE_INTERNAL_URL = process.env.SUPABASE_INTERNAL_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase credentials");
}

/**
 * Create SSR client that uses cookies for session storage
 * This ensures client-side and server-side (SSR) can share the same session
 */
export const createClientSSR = ({ request, cookies }: { request: Request; cookies: AstroCookies }) => {
  return createServerClient(SUPABASE_INTERNAL_URL, PUBLIC_SUPABASE_KEY, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get("Cookie") ?? "";

        const parsed = parseCookieHeader(cookieHeader);
        return parsed.map((cookie) => ({
          name: cookie.name,
          value: cookie.value ?? "",
        }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookies.set(name, value, options);
          } catch {
            // Ignore errors when trying to set cookies after response is sent
            // This commonly happens during auth operations in middleware
          }
        });
      },
    },
  });
};

/**
 * Create browser client for client-side operations
 */
export const createClientBrowser = () => {
  return createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY);
};

/**
 * Create service role client for server-side operations that need to bypass RLS
 * This client has full access to all data and should only be used for specific server operations
 */
export const createClientService = () => {
  return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Pre-configured browser client instance for convenience
export const supabaseClient = createClientBrowser();

export type SupabaseClient =
  | ReturnType<typeof createClientSSR>
  | ReturnType<typeof createClientBrowser>
  | ReturnType<typeof createClientService>;
