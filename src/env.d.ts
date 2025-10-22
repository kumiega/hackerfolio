/// <reference types="astro/client" />

import type { SupabaseClient } from "@/db/supabase.client";

declare global {
  namespace App {
    interface Locals {
      requestId: string;
      supabase: SupabaseClient;
    }
  }
}

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
