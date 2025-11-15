import { config } from "dotenv";
import { z } from "zod";

/**
 * Environment configuration schema
 */
const envSchema = z.object({
  // App
  PUBLIC_BASE_URL: z.string().optional(),

  // Supabase
  PUBLIC_SUPABASE_URL: z.string(),
  PUBLIC_SUPABASE_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),

  // Supabase Auth
  GOTRUE_DISABLE_SIGNUP: z.string().optional(),
  GOTRUE_EXTERNAL_HOSTS: z.string().optional(),
  GOTRUE_URI_ALLOW_LIST: z.string().optional(),
  GOTRUE_EXTERNAL_GITHUB_ENABLED: z.string().optional(),
  GOTRUE_EXTERNAL_GITHUB_CLIENT_ID: z.string(),
  GOTRUE_EXTERNAL_GITHUB_SECRET: z.string(),
  GOTRUE_EXTERNAL_GITHUB_REDIRECT_URI: z.string().optional(),

  // AI features
  OPENROUTER_API_KEY: z.string(),

  // E2E specific (optional)
  PUBLIC_E2E_SUPABASE_URL: z.string().optional(),
  PUBLIC_E2E_SUPABASE_KEY: z.string().optional(),
  E2E_SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

/**
 * Load environment variables based on NODE_ENV
 */
function loadEnvironment() {
  const nodeEnv = process.env.NODE_ENV || "development";

  // Load appropriate .env file based on environment
  switch (nodeEnv) {
    case "production":
      config({ path: ".env.production" });
      break;
    case "test":
      config({ path: ".env.test" });
      break;
    case "development":
    default:
      config({ path: ".env" });
      break;
  }

  // Validate environment variables
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Environment validation failed:");
    console.error(parsed.error.format());
    throw new Error("Invalid environment configuration");
  }

  return parsed.data;
}

/**
 * Environment configuration
 */
export const env = loadEnvironment();

/**
 * Get Supabase configuration for current environment
 */
export function getSupabaseConfig() {
  // Use E2E environment variables if in test mode and they exist
  if (env.NODE_ENV === "test" && env.PUBLIC_E2E_SUPABASE_URL && env.PUBLIC_E2E_SUPABASE_KEY) {
    return {
      url: env.PUBLIC_E2E_SUPABASE_URL,
      anonKey: env.PUBLIC_E2E_SUPABASE_KEY,
      serviceRoleKey: env.E2E_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
    };
  }

  // Use regular Supabase config
  return {
    url: env.PUBLIC_SUPABASE_URL,
    anonKey: env.PUBLIC_SUPABASE_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === "development";
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return env.NODE_ENV === "production";
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return env.NODE_ENV === "test";
}
