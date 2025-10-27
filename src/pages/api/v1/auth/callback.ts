import type { APIContext, APIRoute } from "astro";
import { createClientSSR } from "@/db/supabase.client";

export const GET: APIRoute = async ({ request, cookies, redirect }: APIContext) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    console.error("No code provided in URL params");
    return redirect("/");
  }

  const supabase = createClientSSR({ request, cookies });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
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

  return redirect("/dashboard");
};
