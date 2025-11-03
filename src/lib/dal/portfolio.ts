/**
 * Portfolio related data access functions
 */

import { repositories } from "@/lib/repositories";
import { AppError } from "@/lib/error-handler";
import type { PortfolioDisplay, PublicPortfolioDisplay } from "./types";

/**
 * Get user's portfolio for dashboard display
 *
 * @param userId - User ID
 * @returns Promise<PortfolioDisplay | null> - Portfolio data or null if not found
 */
export async function getUserPortfolio(userId: string): Promise<PortfolioDisplay | null> {
  try {
    const portfolio = await repositories.portfolios.findByUserId(userId);
    if (!portfolio) return null;

    return portfolio;
  } catch (error) {
    if (error instanceof AppError && error.code === "DATABASE_ERROR") {
      return null;
    }
    throw error;
  }
}

/**
 * Get public portfolio by username for SSR
 *
 * @param username - Username to lookup
 * @returns Promise<PublicPortfolioDisplay | null> - Public portfolio data or null
 */
export async function getPublicPortfolioByUsername(username: string): Promise<PublicPortfolioDisplay | null> {
  try {
    // Query portfolio with user profile and published data
    // Only return published portfolios
    const { data, error } = await repositories
      .getSupabaseClient()
      .from("portfolios")
      .select(
        `
        id,
        last_published_at,
        published_data,
        user_profiles!inner(username)
      `
      )
      .not("published_data", "is", null)
      .eq("user_profiles.username", username)
      .single();

    // Handle database errors
    if (error) {
      // If no row found, return null (portfolio not published or doesn't exist)
      if (error.code === "PGRST116") {
        return null;
      }
      // For other errors, throw
      throw new AppError("DATABASE_ERROR", undefined, {
        details: { username },
        cause: error,
      });
    }

    if (!data) return null;

    // Extract username from the joined user_profiles
    const userProfiles = data.user_profiles as { username: string } | { username: string }[];
    const profileUsername = Array.isArray(userProfiles) ? userProfiles[0]?.username : userProfiles?.username;

    // Extract data from published_data JSONB
    const publishedData = data.published_data as {
      full_name?: string;
      position?: string;
      bio?: {
        id: string;
        type: string;
        data: Record<string, unknown>;
      }[];
      avatar_url?: string | null;
      sections?: {
        id: string;
        title: string;
        slug: string;
        description: string;
        visible: boolean;
        components: {
          id: string;
          type: string;
          data: Record<string, unknown>;
        }[];
      }[];
    } | null;

    const sections = publishedData?.sections || [];

    // Filter to only visible sections for public display
    const visibleSections = sections.filter((section) => section.visible !== false);

    return {
      id: data.id,
      full_name: publishedData?.full_name || "",
      position: publishedData?.position || "",
      bio: publishedData?.bio || [],
      avatar_url: publishedData?.avatar_url || null,
      published_at: data.last_published_at,
      username: profileUsername || "",
      sections: visibleSections,
    };
  } catch (error) {
    if (error instanceof AppError && error.code === "DATABASE_ERROR") {
      return null;
    }
    throw error;
  }
}
