import type { APIRoute } from "astro";
import { createClientSSR } from "@/db/supabase.client";

import { GITHUB_OAUTH_PROVIDER, ALLOWED_OAUTH_PROVIDERS } from "@/lib/const";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const provider = GITHUB_OAUTH_PROVIDER;
  const validProviders = ALLOWED_OAUTH_PROVIDERS;

  const requestUrl = new URL(request.url);
  const redirectTo = `${requestUrl.origin}/api/v1/auth/callback/github`;

  console.log("GitHub signin initiated", {
    provider,
    origin: requestUrl.origin,
    redirectTo,
    host: requestUrl.host,
    protocol: requestUrl.protocol,
    userAgent: request.headers.get("user-agent"),
    fullUrl: request.url
  });

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
         * ! The redirect URL should be added to the redirect allow list in Supabase Auth settings.
         * ! For local development: http://127.0.0.1:3000/api/v1/auth/callback/github
         * ! For production: https://yourdomain.com/api/v1/auth/callback/github
         * ! https://supabase.com/docs/guides/auth/redirect-urls
         */
        redirectTo,
      },
    });

    if (error) {
      console.error("❌ OAuth signin error:", {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      const errorParam = encodeURIComponent(`Failed to initiate GitHub login: ${error.message}`);
      return redirect(`/signin?error=${errorParam}`);
    }

    console.log("✅ Redirecting to GitHub OAuth:", data.url);
    return redirect(data.url);
  }

  console.error("❌ Invalid OAuth provider:", provider);
  return redirect("/signin?error=Invalid%20OAuth%20provider");
};
