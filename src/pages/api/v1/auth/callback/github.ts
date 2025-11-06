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

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("❌ Session exchange failed:", {
      message: error.message,
      status: error.status,
      name: error.name,
    });

    // Try to get more details about the error
    return new Response(
      JSON.stringify({
        error: error.message,
        status: error.status,
        name: error.name,
        code: (error as any)?.code,
        hint: (error as any)?.hint,
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
