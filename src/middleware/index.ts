import { defineMiddleware } from "astro:middleware";

import { supabaseClient } from "../db/supabase.client.ts";

export const onRequest = defineMiddleware((context, next) => {
  // Add Supabase client to context
  context.locals.supabase = supabaseClient;

  // Generate unique request ID for tracking and error logging
  context.locals.requestId = crypto.randomUUID();

  return next();
});
