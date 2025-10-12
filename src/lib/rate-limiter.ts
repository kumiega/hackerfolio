import type { SupabaseClient } from "@/db/supabase.client";
import { AppError } from "@/lib/error-handler";
import { ERROR_CODES } from "@/lib/error-constants";

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Error message when limit is exceeded */
  message?: string;
  /** Whether to skip rate limiting for certain conditions */
  skip?: (userId: string, identifier: string) => boolean;
}

/**
 * Rate limiting result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of requests made in current window */
  currentCount: number;
  /** Maximum allowed requests */
  maxRequests: number;
  /** Time until reset (milliseconds) */
  resetTime: number;
  /** Time remaining until window resets (milliseconds) */
  remainingTime: number;
}

/**
 * Default rate limit configurations
 */
export const RATE_LIMITS = {
  LINKEDIN_PARSE: {
    maxRequests: 10, // 10 requests per user
    windowMs: 60 * 60 * 1000, // per hour
    message: "Too many LinkedIn profile parsing requests. Please try again later.",
  },
  GITHUB_IMPORT: {
    maxRequests: 20, // 20 requests per user
    windowMs: 60 * 60 * 1000, // per hour
    message: "Too many GitHub import requests. Please try again later.",
  },
} as const;

/**
 * Rate limiting service
 *
 * Uses database-based rate limiting to prevent abuse across multiple instances.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class RateLimiter {
  /**
   * Check if a request should be rate limited
   *
   * @param supabase - Supabase client instance
   * @param userId - User ID to rate limit
   * @param identifier - Unique identifier for the rate limit (e.g., "linkedin_parse")
   * @param config - Rate limit configuration
   * @returns Promise<RateLimitResult>
   */
  static async checkRateLimit(
    supabase: SupabaseClient,
    userId: string,
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    // Check if rate limiting should be skipped
    if (config.skip?.(userId, identifier)) {
      return {
        allowed: true,
        currentCount: 0,
        maxRequests: config.maxRequests,
        resetTime: 0,
        remainingTime: 0,
      };
    }

    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Simple rate limiting using existing database table
      // Count recent rate limit entries for this user and action
      const { count, error } = await supabase
        .from("app_errors")
        .select("*", { count: "exact", head: true })
        .eq("source", "api")
        .eq("error_code", identifier)
        .eq("user_id", userId)
        .gte("occurred_at", new Date(windowStart).toISOString());

      if (error) {
        // If rate limiting check fails, allow the request to prevent blocking legitimate users
        return {
          allowed: true,
          currentCount: 0,
          maxRequests: config.maxRequests,
          resetTime: now + config.windowMs,
          remainingTime: config.windowMs,
        };
      }

      const currentCount = count || 0;

      if (currentCount >= config.maxRequests) {
        // Rate limit exceeded
        return {
          allowed: false,
          currentCount,
          maxRequests: config.maxRequests,
          resetTime: now + config.windowMs,
          remainingTime: config.windowMs,
        };
      }

      // Allow the request - recording will happen in enforceRateLimit
      return {
        allowed: true,
        currentCount,
        maxRequests: config.maxRequests,
        resetTime: now + config.windowMs,
        remainingTime: config.windowMs,
      };
    } catch {
      // If rate limiting fails, allow the request to prevent blocking legitimate users
      return {
        allowed: true,
        currentCount: 0,
        maxRequests: config.maxRequests,
        resetTime: now + config.windowMs,
        remainingTime: config.windowMs,
      };
    }
  }

  /**
   * Enforce rate limiting for a request
   *
   * @param supabase - Supabase client instance
   * @param userId - User ID to rate limit
   * @param identifier - Unique identifier for the rate limit
   * @param config - Rate limit configuration
   * @throws AppError if rate limit is exceeded
   */
  static async enforceRateLimit(
    supabase: SupabaseClient,
    userId: string,
    identifier: string,
    config: RateLimitConfig
  ): Promise<void> {
    const result = await this.checkRateLimit(supabase, userId, identifier, config);

    if (!result.allowed) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, config.message || "Rate limit exceeded", {
        userId,
        details: {
          identifier,
          currentCount: result.currentCount,
          maxRequests: result.maxRequests,
          remainingTime: result.remainingTime,
          resetTime: result.resetTime,
        },
      });
    }

    // Record this request for rate limiting tracking
    try {
      await supabase.from("app_errors").insert({
        source: "api",
        error_code: identifier,
        message: `Rate limit tracking: ${identifier}`,
        severity: "info",
        user_id: userId,
        context: {
          identifier,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {
      // If logging fails, don't block the request
      // This is just for rate limiting tracking
    }
  }
}
