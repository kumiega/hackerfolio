/**
 * Simple in-memory rate limiting utility
 * For production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private cache = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up expired entries periodically
    setInterval(() => {
      this.cleanup();
    }, windowMs / 4);
  }

  /**
   * Checks if the request should be rate limited
   *
   * @param identifier - Unique identifier for the client (e.g., IP address, user ID)
   * @returns true if rate limited, false if allowed
   */
  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const entry = this.cache.get(identifier);

    if (!entry || now > entry.resetTime) {
      // First request or window expired, create new entry
      this.cache.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return false;
    }

    if (entry.count >= this.maxRequests) {
      return true; // Rate limited
    }

    // Increment counter
    entry.count++;
    return false;
  }

  /**
   * Gets remaining requests for an identifier
   *
   * @param identifier - Unique identifier for the client
   * @returns number of remaining requests
   */
  getRemainingRequests(identifier: string): number {
    const entry = this.cache.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  /**
   * Gets reset time for an identifier
   *
   * @param identifier - Unique identifier for the client
   * @returns reset time in milliseconds since epoch
   */
  getResetTime(identifier: string): number {
    const entry = this.cache.get(identifier);
    return entry?.resetTime || Date.now() + this.windowMs;
  }

  /**
   * Cleans up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.resetTime) {
        this.cache.delete(key);
      }
    }
  }
}

// Create rate limiter instances for different use cases
export const apiRateLimiter = new RateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes
export const githubRateLimiter = new RateLimiter(60 * 60 * 1000, 50); // 50 GitHub API calls per hour per user

/**
 * Rate limiting middleware function for API routes
 *
 * @param identifier - Unique identifier for rate limiting (e.g., IP address)
 * @param limiter - Rate limiter instance to use
 * @returns Response if rate limited, null if allowed
 */
export function checkRateLimit(identifier: string, limiter: RateLimiter = apiRateLimiter): Response | null {
  if (limiter.isRateLimited(identifier)) {
    const resetTime = limiter.getResetTime(identifier);
    const resetInSeconds = Math.ceil((resetTime - Date.now()) / 1000);

    return new Response(
      JSON.stringify({
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
          requestId: crypto.randomUUID(),
          details: {
            resetInSeconds,
          },
        },
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": resetInSeconds.toString(),
          "X-RateLimit-Reset": resetTime.toString(),
        },
      }
    );
  }

  return null; // Not rate limited
}
