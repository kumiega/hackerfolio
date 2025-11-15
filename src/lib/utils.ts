import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates if a string is a valid UUID format
 * @param str - The string to validate
 * @returns true if the string is a valid UUID, false otherwise
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Generates the appropriate portfolio preview URL based on the environment
 * @param username - The username of the portfolio owner
 * @returns The URL to view the portfolio
 */
export function getPortfolioPublicUrl(username: string): string {
  // In production, use subdomain; in other environments, use /public route
  const isProduction = import.meta.env.PROD;

  if (isProduction) {
    // Get base domain from PUBLIC_BASE_URL environment variable
    const baseUrl = import.meta.env.PUBLIC_BASE_URL;
    let baseDomain = "hackerfolio.com"; // fallback default

    if (baseUrl) {
      try {
        const url = new URL(baseUrl);
        baseDomain = url.hostname;
      } catch {
        // Ignore invalid URLs, use fallback
      }
    }

    return `https://${username}.${baseDomain}`;
  } else {
    // In development/test, use the /public route
    return `/public/${username}`;
  }
}
