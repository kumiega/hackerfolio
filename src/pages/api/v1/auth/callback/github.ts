import type { APIContext, APIRoute } from "astro";
import { createClientSSR } from "@/db/supabase.client";

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

  return redirect("/dashboard");
};
