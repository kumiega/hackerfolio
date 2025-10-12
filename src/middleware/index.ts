import { defineMiddleware } from "astro:middleware";

import { supabaseClient } from "../db/supabase.client.ts";

export const onRequest = defineMiddleware((context, next) => {
  // Add Supabase client to context (only if environment variables are available)
  try {
    context.locals.supabase = supabaseClient;
  } catch (error) {
    // Handle case where Supabase client can't be initialized
    console.warn("Supabase client not available:", error);
  }

  // Generate unique request ID for tracking and error logging
  context.locals.requestId = crypto.randomUUID();

  return next();
});
