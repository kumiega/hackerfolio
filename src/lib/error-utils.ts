import type { SupabaseClient } from "@/db/supabase.client";

/**
 * Parameters for error logging to app_errors table
 */
export interface LogErrorParams {
  message: string;
  severity?: "debug" | "info" | "warn" | "error" | "fatal";
  source?: "frontend" | "api" | "edge" | "worker" | "db" | "other";
  error_code?: string;
  route?: string;
  endpoint?: string;
  request_id?: string;
  session_id?: string;
  stack?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: any;
  portfolio_id?: string;
}

/**
 * Helper function for error logging to app_errors table
 *
 * @param supabase - Supabase client instance
 * @param params - Error parameters matching log_app_error function signature
 */
export async function logError(supabase: SupabaseClient, params: LogErrorParams): Promise<void> {
  try {
    await supabase.rpc("log_app_error", {
      message_in: params.message,
      severity_in: params.severity || "error",
      source_in: params.source || "api",
      error_code_in: params.error_code || undefined,
      route_in: params.route || undefined,
      endpoint_in: params.endpoint || undefined,
      request_id_in: params.request_id || undefined,
      session_id_in: params.session_id || undefined,
      stack_in: params.stack || undefined,
      context_in: params.context || {},
      client_ip_in: undefined,
      user_agent_in: undefined,
      portfolio_id_in: params.portfolio_id || undefined,
    });
  } catch (logError) {
    // eslint-disable-next-line no-console
    console.error("Failed to log error to database:", logError);
    // eslint-disable-next-line no-console
    console.error("Original error:", params);
  }
}
