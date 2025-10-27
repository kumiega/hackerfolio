import { createClient } from "@supabase/supabase-js";
import { PUBLIC_SUPABASE_URL } from "astro:env/client";
import { SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";

import type { Database } from "./database.types.ts";

/**
 * Client for server to server communication
 */
export const supabaseServiceClient = createClient<Database>(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

export type SupabaseServiceClient = typeof supabaseServiceClient;
