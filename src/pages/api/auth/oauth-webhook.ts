import type { APIRoute } from "astro";

// Disable prerendering for this API route
export const prerender = false;

/**
 * OAuth Webhook for Supabase Auth
 *
 * This endpoint is called by Supabase when users authenticate via OAuth providers.
 * It stores the OAuth tokens in our oauth_tokens table for later use.
 *
 * Configure this webhook URL in your Supabase Auth settings:
 * Dashboard > Authentication > Hooks > Auth Webhooks
 *
 * @returns 200 - Webhook processed successfully
 */
export const POST: APIRoute = async (context) => {
  try {
    const { request } = context;
    const body = await request.json();

    // Verify this is a Supabase webhook (basic validation)
    const supabaseSignature = request.headers.get("x-supabase-signature");
    if (!supabaseSignature) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract relevant data from webhook payload
    const {
      type,
      record: { id: userId, identities },
    } = body;

    // Only process successful OAuth sign-ins
    if (type !== "INSERT" || !identities || identities.length === 0) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Find GitHub identity
    const githubIdentity = identities.find((identity: { provider: string }) => identity.provider === "github");

    if (!githubIdentity) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract OAuth tokens from identity
    const { access_token, refresh_token, expires_at, scope } = githubIdentity;

    if (!access_token) {
      // No access token received - skip processing
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Store tokens in our oauth_tokens table
    const supabase = context.locals.supabase;

    const { error: upsertError } = await supabase.from("oauth_tokens").upsert(
      {
        user_id: userId,
        provider: "github",
        access_token,
        refresh_token,
        expires_at,
        scope,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,provider",
      }
    );

    if (upsertError) {
      return new Response(JSON.stringify({ error: "Failed to store tokens" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
