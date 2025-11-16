import { createBrowserClient, createServerClient, parseCookieHeader } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";
import { getSupabaseConfig } from "@/lib/env";

/**
 * Create SSR client that uses cookies for session storage
 * This ensures client-side and server-side (SSR) can share the same session
 */
export const createClientSSR = ({ request, cookies }: { request: Request; cookies: AstroCookies }) => {
  const { url, anonKey } = getSupabaseConfig();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "").map((cookie) => ({
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
  const { url, anonKey } = getSupabaseConfig();
  return createBrowserClient(url, anonKey);
};

/**
 * Create service role client for server-side operations that need to bypass RLS
 * This client has full access to all data and should only be used for specific server operations
 */
export const createClientService = () => {
  const { url, serviceRoleKey } = getSupabaseConfig();
  if (!serviceRoleKey) {
    throw new Error("Service role key not available");
  }
  return createClient(url, serviceRoleKey, {
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
