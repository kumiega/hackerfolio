export const GITHUB_OAUTH_PROVIDER = "github";
export const ALLOWED_OAUTH_PROVIDERS = [GITHUB_OAUTH_PROVIDER];

export const TOKENS_LIMIT = 10000;
export const PORTFOLIO_GENERATION_PROMPT_TEMPERATURE = 0.3;

export const STORAGE_STATE_PATH = "playwright/.auth/storage.json";

export const TEST_USER = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  email: "e2e-test-user-2025-unique@example.com",
  password: "secure-test-password-123!",
};

export const RESERVED_USERNAMES = new Set([
  "www",
  "api",
  "studio",
  "ftp",
  "mail",
  "smtp",
  "pop",
  "imap",
  "admin",
  "root",
  "support",
  "help",
  "dashboard",
  "app",
  "auth",
  "login",
  "register",
  "signin",
  "signup",
  "account",
  "billing",
  "status",
  "blog",
  "docs",
  "assets",
  "static",
  "media",
  "public",
  "supabase",
  "kong",
  "database",
]);
