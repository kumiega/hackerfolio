import { createBrowserClient, createServerClient, parseCookieHeader } from "@supabase/ssr";
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
          } catch (error) {
            // Ignore errors when trying to set cookies after response is sent
            // This commonly happens during auth operations in middleware
            if (error.message?.includes("response has already been sent")) {
              console.debug("Cookie set attempted after response sent, ignoring:", name);
            } else {
              throw error;
            }
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

// Pre-configured browser client instance for convenience
export const supabaseClient = createClientBrowser();

export type SupabaseClient = ReturnType<typeof createClientSSR> | ReturnType<typeof createClientBrowser>;
