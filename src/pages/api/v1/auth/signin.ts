import type { APIRoute } from "astro";
import { createClientSSR } from "@/db/supabase.client";

import { GITHUB_OAUTH_PROVIDER, ALLOWED_OAUTH_PROVIDERS } from "@/lib/const";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const provider = GITHUB_OAUTH_PROVIDER;

  const validProviders = ALLOWED_OAUTH_PROVIDERS;

  const supabase = createClientSSR({
    request: request,
    cookies: cookies,
  });

  if (provider && validProviders.includes(provider)) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        scopes: "public_repo, read:user, user:email",
        /**
         * ! This redirect URL should be added to the redirect allow list of Supabase in its env variables.
         * ! https://supabase.com/docs/guides/auth/redirect-urls
         */
        redirectTo: "http://127.0.0.1:3000/api/v1/auth/callback",
      },
    });

    if (error) {
      console.error("error in /signin :", error);
      return new Response(error.message, { status: 500 });
    }

    console.log("✅ OAuth URL generated:", data.url);
    return redirect(data.url);
  }

  console.error("❌ Invalid OAuth provider:", provider);
  return redirect("/");
};
