import type { APIRoute } from "astro";
import { supabaseServiceClient } from "@/db/supabase.server";

export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabaseServiceClient
      .from("user_profiles")
      .select("id, username, avatar_url, created_at");

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
