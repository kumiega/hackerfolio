import type { APIContext, APIRoute } from "astro";
import { createClientSSR } from "@/db/supabase.client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/error-handler";
import { logError } from "@/lib/error-utils";

export const GET: APIRoute = async ({ request, cookies, redirect }: APIContext) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Check if GitHub returned an error
  if (error) {
    return redirect(`/?error=${encodeURIComponent(errorDescription || error)}`);
  }

  if (!code) {
    return redirect("/?error=no_code");
  }

  const supabase = createClientSSR({ request, cookies });

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    // Redirect to signin with error instead of returning JSON
    const errorParam = encodeURIComponent(`Authentication failed: ${exchangeError.message}`);
    return redirect(`/signin?error=${errorParam}`);
  }

  // Store GitHub provider token for later use
  if (data?.session?.provider_token && data?.user?.id) {
    try {
      await storeGitHubToken(supabase, data.user.id, data.session.provider_token, data.session.provider_refresh_token);
    } catch (tokenError) {
      // Log the error but don't fail the authentication flow
      await logError(supabase, {
        message: "Failed to store GitHub provider token",
        severity: "warn",
        source: "api",
        endpoint: "GET /api/v1/auth/callback/github",
        route: request.url,
        request_id: crypto.randomUUID(),
        context: {
          user_id: data.user.id,
          error: tokenError instanceof Error ? tokenError.message : String(tokenError),
        },
      });
    }
  }

  return redirect("/dashboard");
};

/**
 * Stores GitHub OAuth tokens for a user
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @param accessToken - GitHub access token
 * @param refreshToken - GitHub refresh token (optional)
 */
async function storeGitHubToken(
  supabase: SupabaseClient,
  userId: string,
  accessToken: string,
  refreshToken?: string
): Promise<void> {
  try {
    console.log("Storing GitHub token for user:", userId);

    const tokenData = {
      user_id: userId,
      provider: "github",
      access_token: accessToken,
      refresh_token: refreshToken || null,
      expires_at: null, // GitHub tokens don't have expiration by default
      token_type: "Bearer",
      scope: "repo,user",
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("oauth_tokens").upsert(tokenData, {
      onConflict: "user_id,provider",
    });

    if (error) {
      console.error("Failed to store GitHub token:", error);
      throw new AppError("DATABASE_ERROR", `Failed to store GitHub token: ${error.message}`);
    }

    console.log("Successfully stored GitHub token for user:", userId);
  } catch (error) {
    console.error("Error in storeGitHubToken:", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("DATABASE_ERROR", "Failed to store GitHub token");
  }
}
