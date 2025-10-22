import type { APIRoute } from "astro";
import type { ApiSuccessResponse, ApiErrorResponse, ErrorIntakeResponseDto, ErrorIntakeCommand } from "@/types";
import { logError } from "@/lib/error-utils";
import { RateLimiter } from "@/lib/rate-limiter";
import { AuthService } from "@/lib/services/auth.service";
import { ERROR_CODES } from "@/lib/error-constants";

// Disable prerendering for this API route
export const prerender = false;

/**
 * POST /api/v1/errors
 *
 * Error intake endpoint for logging errors from authenticated clients and server subsystems.
 * This endpoint mirrors the public.log_app_error RPC function and accepts error reports
 * for monitoring and debugging purposes.
 *
 * Rate limited to 200 requests per minute per user.
 *
 * @returns 202 - Error accepted for processing
 * @returns 401 - User not authenticated
 * @returns 413 - Payload too large
 * @returns 422 - Validation error
 * @returns 429 - Rate limit exceeded
 */
export const POST: APIRoute = async (context) => {
  const { request, locals } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();

  try {
    // Step 1: Get current user for rate limiting (optional authentication)
    let userId: string | null = null;
    try {
      const authenticatedUser = await AuthService.getCurrentSession(supabase);
      userId = authenticatedUser.user.id;
    } catch {
      // Error intake is allowed for anonymous users, but rate limiting will be IP-based
      userId = null;
    }

    // Step 2: Parse and validate request body
    let body: ErrorIntakeCommand;
    try {
      body = await request.json();
    } catch {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON in request body",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 3: Validate payload size (256KB limit)
    const payloadSize = new TextEncoder().encode(JSON.stringify(body)).length;
    if (payloadSize > 256 * 1024) {
      // 256KB
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Payload too large (maximum 256KB)",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 4: Validate required fields
    if (!body.message || typeof body.message !== "string" || body.message.trim().length === 0) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Message is required and must be a non-empty string",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 5: Validate enum fields
    const validSeverities = ["debug", "info", "warn", "error", "fatal"];
    if (body.severity && !validSeverities.includes(body.severity)) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Severity must be one of: debug, info, warn, error, fatal",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validSources = ["frontend", "api", "edge", "worker", "db", "other"];
    if (body.source && !validSources.includes(body.source)) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Source must be one of: frontend, api, edge, worker, db, other",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 6: Rate limiting (200 requests per minute)
    // Use userId if authenticated, otherwise use a generic identifier for anonymous requests
    const rateLimitIdentifier = "error_intake";
    const rateLimitUserId = userId || "anonymous";

    try {
      await RateLimiter.enforceRateLimit(supabase, rateLimitUserId, rateLimitIdentifier, {
        maxRequests: 200, // 200 requests per minute
        windowMs: 60 * 1000, // 1 minute
        message: "Too many error reports. Please try again later.",
      });
    } catch (rateLimitError: any) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR", // Rate limiting uses VALIDATION_ERROR code
          message: rateLimitError?.message || "Rate limit exceeded",
          requestId,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 7: Log the error asynchronously
    // Fire and forget - don't wait for completion to avoid blocking the response
    logError(supabase, {
      message: body.message,
      severity: body.severity || "error",
      source: body.source || "frontend",
      error_code: body.error_code,
      route: body.route,
      endpoint: body.endpoint,
      request_id: body.request_id || requestId,
      session_id: body.session_id,
      stack: body.stack,
      context: body.context || {},
      portfolio_id: body.portfolio_id,
    }).catch((logError) => {
      // If error logging itself fails, log to console as fallback
      // eslint-disable-next-line no-console
      console.error("Failed to log error to database:", logError);
      // eslint-disable-next-line no-console
      console.error("Original error data:", body);
    });

    // Step 8: Return success response immediately
    const response: ApiSuccessResponse<ErrorIntakeResponseDto> = {
      data: {
        accepted: true,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 202,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    // Handle unexpected errors (500)
    // eslint-disable-next-line no-console
    console.error("Unexpected error in error intake endpoint:", error);

    const errorResponse: ApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while processing the error report",
        requestId,
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
