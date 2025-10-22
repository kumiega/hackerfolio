import { createClient } from "@supabase/supabase-js";
import { PUBLIC_SUPABASE_URL } from "astro:env/client";
import { SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";

import type { Database } from "./database.types.ts";

// Service role client for server-side operations that bypass RLS
export const supabaseServiceClient = createClient<Database>(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export type SupabaseServiceClient = typeof supabaseServiceClient;
