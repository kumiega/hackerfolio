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

    return {
      id: portfolio.id,
      title: portfolio.title,
      description: portfolio.description,
      is_published: portfolio.is_published,
      published_at: portfolio.published_at,
      created_at: portfolio.created_at,
    };
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
    // Query portfolio with user profile, sections, and components in a single optimized query
    // Only return published portfolios with visible sections
    const { data, error } = await repositories
      .getSupabaseClient()
      .from("portfolios")
      .select(
        `
        id,
        user_id,
        is_published,
        published_at,
        title,
        description,
        created_at,
        user_profiles!inner(username),
        sections!inner(
          id,
          name,
          position,
          visible,
          components(
            id,
            type,
            position,
            data
          )
        )
      `
      )
      .eq("is_published", true)
      .eq("user_profiles.username", username)
      .eq("sections.visible", true)
      .order("sections.position", { ascending: true })
      .order("sections.components.position", { ascending: true })
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
    const profileUsername = Array.isArray(data.user_profiles)
      ? data.user_profiles[0]?.username
      : data.user_profiles?.username;

    // Transform sections to include components
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const sections = Array.isArray(data.sections)
      ? data.sections.map((section: any) => {
          const components = Array.isArray(section.components)
            ? section.components.map((component: any) => ({
                id: component.id,
                type: component.type,
                position: component.position,
                data: component.data,
              }))
            : [];
          return {
            id: section.id,
            name: section.name,
            position: section.position,
            components,
          };
        })
      : [];
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      published_at: data.published_at,
      username: profileUsername || "",
      sections,
    };
  } catch (error) {
    if (error instanceof AppError && error.code === "DATABASE_ERROR") {
      return null;
    }
    throw error;
  }
}
