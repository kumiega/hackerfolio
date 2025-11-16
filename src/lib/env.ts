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

  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

/**
 * Server-side environment configuration
 * Only loaded when running on the server
 */
let serverEnv: z.infer<typeof envSchema> | null = null;

/**
 * Load environment variables based on NODE_ENV
 * This should only be called on the server side
 */
function loadEnvironment(): z.infer<typeof envSchema> {
  // Return cached environment if already loaded
  if (serverEnv) {
    return serverEnv;
  }

  // Only load environment on server side
  if (typeof process === "undefined" || !process.env) {
    throw new Error("Environment loading is only available on the server side");
  }

  // Validate environment variables from any source (GitHub Actions, deployment platform, system, etc.)
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join(", ");
    throw new Error(`Invalid environment configuration: ${errors}`);
  }

  serverEnv = parsed.data;
  return parsed.data;
}

/**
 * Get server-side environment configuration
 * Only call this on the server side
 */
export function getServerEnv(): z.infer<typeof envSchema> {
  return loadEnvironment();
}

/**
 * Client-side environment configuration
 * Safe to access on both server and client
 */
export const clientEnv = {
  PUBLIC_BASE_URL: import.meta.env?.PUBLIC_BASE_URL,
  PUBLIC_SUPABASE_URL: import.meta.env?.PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_KEY: import.meta.env?.PUBLIC_SUPABASE_KEY,
  NODE_ENV: import.meta.env?.DEV ? "development" : import.meta.env?.PROD ? "production" : "development",
} as const;

/**
 * Environment configuration - server-side only
 * @deprecated Use getServerEnv() for server-side access or clientEnv for client-side access
 */
export const env = (() => {
  // Only load on server side
  if (typeof process !== "undefined" && process.env) {
    // Note: This synchronous export cannot handle async loading
    // Use getServerEnv() instead for new code
    throw new Error("Use getServerEnv() instead of the deprecated env export");
  }
  // Return empty object for client side (will be tree-shaken in production)
  return {} as z.infer<typeof envSchema>;
})();

/**
 * Get Supabase configuration for current environment
 */
export function getSupabaseConfig() {
  // Get environment config (server-side or client-side)
  const isServer = typeof process !== "undefined" && process.env;
  const envConfig = isServer ? getServerEnv() : clientEnv;

  // Use Supabase config
  return {
    url: envConfig.PUBLIC_SUPABASE_URL,
    anonKey: envConfig.PUBLIC_SUPABASE_KEY,
    serviceRoleKey: isServer ? (envConfig as z.infer<typeof envSchema>).SUPABASE_SERVICE_ROLE_KEY : undefined,
  };
}

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
  const envConfig = typeof process !== "undefined" && process.env ? getServerEnv() : clientEnv;
  return envConfig.NODE_ENV === "development";
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  const envConfig = typeof process !== "undefined" && process.env ? getServerEnv() : clientEnv;
  return envConfig.NODE_ENV === "production";
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  const envConfig = typeof process !== "undefined" && process.env ? getServerEnv() : clientEnv;
  return envConfig.NODE_ENV === "test";
}
