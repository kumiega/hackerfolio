import { createBrowserClient } from "@supabase/ssr";
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY } from "astro:env/client";

import type { Database } from "./database.types.ts";

// Create browser client that uses cookies for session storage
// This ensures client-side and server-side (SSR) can share the same session
export const supabaseClient = createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY);

export type SupabaseClient = typeof supabaseClient;
