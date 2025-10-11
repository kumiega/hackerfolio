import type { ApiErrorResponse } from "@/types";
import type { SupabaseClient } from "@/db/supabase.client";
import { logError } from "@/lib/error-utils";

/**
 * Base error class for application errors
 *
 * Provides consistent error structure across services
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly userId?: string;
  public readonly portfolioId?: string;
  public readonly details?: unknown;

  constructor(
    code: string,
    message?: string,
    options?: {
      userId?: string;
      portfolioId?: string;
      details?: unknown;
      cause?: Error;
    }
  ) {
    super(message || code);
    this.name = code;
    this.code = code;
    this.userId = options?.userId;
    this.portfolioId = options?.portfolioId;
    this.details = options?.details;

    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Configuration for mapping error codes to HTTP status codes and default messages
 */
export interface ErrorMapping {
  statusCode: number;
  defaultMessage: string;
  isUserError?: boolean; // true if error is due to user input, false for server errors
}

/**
 * Centralized error code to HTTP response mapping
 */
export const ERROR_MAPPINGS: Record<string, ErrorMapping> = {
  // Authentication errors
  UNAUTHENTICATED: {
    statusCode: 401,
    defaultMessage: "Authentication required",
    isUserError: true,
  },
  PROFILE_NOT_FOUND: {
    statusCode: 401,
    defaultMessage: "User profile not found",
    isUserError: true,
  },
  UNAUTHORIZED: {
    statusCode: 403,
    defaultMessage: "Access denied",
    isUserError: true,
  },

  // Portfolio errors
  PORTFOLIO_NOT_FOUND: {
    statusCode: 404,
    defaultMessage: "Portfolio not found or access denied",
    isUserError: true,
  },
  UNMET_REQUIREMENTS: {
    statusCode: 409,
    defaultMessage: "Portfolio does not meet publication requirements",
    isUserError: true,
  },
  INVALID_PORTFOLIO_ID: {
    statusCode: 400,
    defaultMessage: "Portfolio ID is required and must be a valid UUID",
    isUserError: true,
  },

  // Section errors
  INVALID_SECTION_ID: {
    statusCode: 400,
    defaultMessage: "Section ID is required and must be a valid UUID",
    isUserError: true,
  },
  SECTION_NOT_FOUND: {
    statusCode: 404,
    defaultMessage: "Section not found or access denied",
    isUserError: true,
  },

  // Validation errors
  VALIDATION_ERROR: {
    statusCode: 422,
    defaultMessage: "Invalid input data",
    isUserError: true,
  },

  // Auth-specific validation
  INVALID_USERNAME_FORMAT: {
    statusCode: 400,
    defaultMessage: "Username must be 3-30 characters, lowercase letters, numbers, and hyphens only",
    isUserError: true,
  },
  USERNAME_ALREADY_SET: {
    statusCode: 409,
    defaultMessage: "Username has already been set for this account",
    isUserError: true,
  },
  USERNAME_TAKEN: {
    statusCode: 409,
    defaultMessage: "This username is already taken",
    isUserError: true,
  },
  INVALID_JSON: {
    statusCode: 400,
    defaultMessage: "Request body must be valid JSON",
    isUserError: true,
  },

  // Generic errors
  DATABASE_ERROR: {
    statusCode: 500,
    defaultMessage: "Database error occurred",
    isUserError: false,
  },
  INTERNAL_ERROR: {
    statusCode: 500,
    defaultMessage: "An unexpected error occurred",
    isUserError: false,
  },
};

/**
 * Creates a standardized API error response
 */
export function createErrorResponse(
  errorCode: string,
  requestId: string,
  customMessage?: string,
  details?: unknown
): Response {
  const mapping = ERROR_MAPPINGS[errorCode] || ERROR_MAPPINGS.INTERNAL_ERROR;

  const errorResponse: ApiErrorResponse = {
    error: {
      code: errorCode,
      message: customMessage || mapping.defaultMessage,
      requestId,
      ...(details ? { details } : {}),
    },
  };

  return new Response(JSON.stringify(errorResponse), {
    status: mapping.statusCode,
    headers: {
      "Content-Type": "application/json",
      ...(mapping.isUserError === false && { "Retry-After": "60" }), // Suggest retry for server errors
    },
  });
}

/**
 * Gets the error mapping for a given error code
 */
export function getErrorMapping(errorCode: string): ErrorMapping {
  return ERROR_MAPPINGS[errorCode] || ERROR_MAPPINGS.INTERNAL_ERROR;
}

/**
 * Context for error handling in API routes
 */
export interface ErrorHandlerContext {
  supabase: SupabaseClient;
  requestId: string;
  endpoint: string;
  route: string;
  portfolioId?: string;
  userId?: string;
}

/**
 * Standardized error handler for API routes
 *
 * This function:
 * 1. Identifies the error type from error.name or error.message
 * 2. Maps it to appropriate HTTP status code and message
 * 3. Logs server errors to the database
 * 4. Returns standardized error response
 */
export async function handleApiError(error: unknown, context: ErrorHandlerContext): Promise<Response> {
  // Extract error code from error object
  const errorCode = extractErrorCode(error);
  const mapping = getErrorMapping(errorCode);

  // Log server errors (not user errors) to database
  if (!mapping.isUserError) {
    await logError(context.supabase, {
      message: (error as Error)?.message || "Unexpected error in API endpoint",
      severity: "error",
      source: "api",
      error_code: errorCode,
      endpoint: context.endpoint,
      route: context.route,
      request_id: context.requestId,
      stack: (error as Error)?.stack,
      context: {
        user_id: context.userId,
        portfolio_id: context.portfolioId,
      },
      portfolio_id: context.portfolioId,
    });
  }

  // Return standardized error response
  return createErrorResponse(errorCode, context.requestId);
}

/**
 * Extracts error code from various error types
 */
function extractErrorCode(error: unknown): string {
  if (!error) return "INTERNAL_ERROR";

  const err = error as { name?: string; message?: string };

  // Check error.name first (preferred), then error.message
  const errorIdentifier = err.name || err.message;

  // Handle common error patterns
  if (typeof errorIdentifier === "string") {
    // Direct match with error mappings
    if (ERROR_MAPPINGS[errorIdentifier]) {
      return errorIdentifier;
    }

    // Handle special cases
    if (errorIdentifier.includes("UNAUTHENTICATED")) return "UNAUTHENTICATED";
    if (errorIdentifier.includes("PROFILE_NOT_FOUND")) return "PROFILE_NOT_FOUND";
    if (errorIdentifier.includes("PORTFOLIO_NOT_FOUND")) return "PORTFOLIO_NOT_FOUND";
    if (errorIdentifier.includes("UNMET_REQUIREMENTS")) return "UNMET_REQUIREMENTS";
    if (errorIdentifier.includes("VALIDATION_ERROR")) return "VALIDATION_ERROR";
    if (errorIdentifier.includes("DATABASE_ERROR")) return "DATABASE_ERROR";
    if (errorIdentifier.includes("INVALID_USERNAME_FORMAT")) return "INVALID_USERNAME_FORMAT";
    if (errorIdentifier.includes("USERNAME_ALREADY_SET")) return "USERNAME_ALREADY_SET";
    if (errorIdentifier.includes("USERNAME_TAKEN")) return "USERNAME_TAKEN";
    if (errorIdentifier.includes("INVALID_JSON")) return "INVALID_JSON";
  }

  // Default to internal error for unknown errors
  return "INTERNAL_ERROR";
}
