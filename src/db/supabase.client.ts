import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY } from "astro:env/client";
import type { AstroCookies } from "astro";

// Create browser client that uses cookies for session storage
// This ensures client-side and server-side (SSR) can share the same session
export const createClientSSR = ({ request, cookies }: { request: Request; cookies: AstroCookies }) => {
  return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "").map((cookie) => ({
          name: cookie.name,
          value: cookie.value ?? "",
        }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookies.set(name, value, options));
      },
    },
  });
};

export type SupabaseClientSSR = ReturnType<typeof createClientSSR>;
