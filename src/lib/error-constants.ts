/**
 * Centralized error constants to avoid magic strings across the application
 */
export const ERROR_CODES = {
  // Authentication errors
  UNAUTHENTICATED: "UNAUTHENTICATED",
  PROFILE_NOT_FOUND: "PROFILE_NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",

  // Portfolio errors
  PORTFOLIO_NOT_FOUND: "PORTFOLIO_NOT_FOUND",
  UNMET_REQUIREMENTS: "UNMET_REQUIREMENTS",
  DATABASE_ERROR: "DATABASE_ERROR",
  INVALID_PORTFOLIO_ID: "INVALID_PORTFOLIO_ID",

  // Auth-specific validation errors
  INVALID_USERNAME_FORMAT: "INVALID_USERNAME_FORMAT",
  USERNAME_ALREADY_SET: "USERNAME_ALREADY_SET",
  USERNAME_TAKEN: "USERNAME_TAKEN",

  // Generic errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;

/**
 * Type representing all valid error codes
 */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
