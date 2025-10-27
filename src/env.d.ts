/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: AuthSessionDto;
    requestId: string;
    supabase: SupabaseClientSSR;
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
