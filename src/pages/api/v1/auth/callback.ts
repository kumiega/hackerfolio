import type { APIContext, APIRoute } from "astro";
import { createClientSSR } from "@/db/supabase.client";

export const GET: APIRoute = async ({ request, cookies, redirect }: APIContext) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  console.log("🔥 Callback hit!");
  console.log("📍 Full URL:", url.href);
  console.log("🔑 Code:", url.searchParams.get("code")?.substring(0, 10) + "...");

  if (!code) {
    console.error("No code provided in URL params");
    return redirect("/");
  }

  const supabase = createClientSSR({ request, cookies });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth exchange error details:", {
      message: error.message,
      status: error.status,
      name: error.name,
      stack: error.stack,
    });
    return new Response(
      JSON.stringify({
        error: error.message,
        status: error.status,
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  console.log("🔍 Session data:", data);

  return redirect("/dashboard");
};
