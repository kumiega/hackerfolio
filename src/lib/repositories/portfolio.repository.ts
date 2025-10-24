import type { Database } from "@/db/database.types";
import { BaseRepository } from "./base.repository";

type PortfolioRow = Database["public"]["Tables"]["portfolios"]["Row"];
type PortfolioInsert = Database["public"]["Tables"]["portfolios"]["Insert"];
type PortfolioUpdate = Database["public"]["Tables"]["portfolios"]["Update"];

type PortfolioWithUserProfile = PortfolioRow & {
  user_profiles: {
    username: string;
  };
};

/**
 * Repository for portfolio data access operations
 *
 * Handles all database operations related to portfolios including:
 * - Portfolio CRUD operations
 * - Publication status management
 * - User portfolio retrieval
 */
export class PortfolioRepository extends BaseRepository {
  private readonly tableName = "portfolios";

  /**
   * Find a portfolio by ID
   *
   * @param portfolioId - Portfolio ID to search for
   * @returns Promise<PortfolioRow | null> - Portfolio or null if not found
   */
  async findById(portfolioId: string): Promise<PortfolioRow | null> {
    return this.executeQueryNullable(
      async () => await this.supabase.from(this.tableName).select("*").eq("id", portfolioId).single(),
      "Failed to find portfolio",
      { portfolioId }
    );
  }

  /**
   * Find a portfolio by user ID
   *
   * @param userId - User ID to search for
   * @returns Promise<PortfolioRow | null> - User's portfolio or null if not found
   */
  async findByUserId(userId: string): Promise<PortfolioRow | null> {
    return this.executeQueryNullable(
      async () => await this.supabase.from(this.tableName).select("*").eq("user_id", userId).single(),
      "Failed to find portfolio by user ID",
      { userId }
    );
  }

  /**
   * Create a new portfolio
   *
   * @param portfolio - Portfolio data to insert
   * @returns Promise<PortfolioRow> - Created portfolio
   */
  async create(portfolio: PortfolioInsert): Promise<PortfolioRow> {
    return this.executeQuery(
      async () => await this.supabase.from(this.tableName).insert(portfolio).select("*").single(),
      "Failed to create portfolio",
      { portfolio }
    );
  }

  /**
   * Update an existing portfolio
   *
   * @param portfolioId - Portfolio ID to update
   * @param updates - Fields to update
   * @returns Promise<PortfolioRow> - Updated portfolio
   */
  async update(portfolioId: string, updates: PortfolioUpdate): Promise<PortfolioRow> {
    return this.executeQuery(
      async () => await this.supabase.from(this.tableName).update(updates).eq("id", portfolioId).select("*").single(),
      "Failed to update portfolio",
      { portfolioId, updates }
    );
  }

  /**
   * Delete a portfolio by ID
   *
   * @param portfolioId - Portfolio ID to delete
   * @returns Promise<void>
   */
  async delete(portfolioId: string): Promise<void> {
    await this.executeQuery(
      async () => await this.supabase.from(this.tableName).delete().eq("id", portfolioId),
      "Failed to delete portfolio",
      { portfolioId }
    );
  }

  /**
   * Check if a portfolio exists by ID
   *
   * @param portfolioId - Portfolio ID to check
   * @returns Promise<boolean> - True if portfolio exists
   */
  async exists(portfolioId: string): Promise<boolean> {
    const result = await this.executeQueryNullable(
      async () => await this.supabase.from(this.tableName).select("id").eq("id", portfolioId).single(),
      "Failed to check portfolio existence",
      { portfolioId }
    );

    return result !== null;
  }

  /**
   * Check if a user has a portfolio
   *
   * @param userId - User ID to check
   * @returns Promise<boolean> - True if user has a portfolio
   */
  async userHasPortfolio(userId: string): Promise<boolean> {
    const result = await this.executeQueryNullable(
      async () => await this.supabase.from(this.tableName).select("id").eq("user_id", userId).single(),
      "Failed to check if user has portfolio",
      { userId }
    );

    return result !== null;
  }

  /**
   * Find all published portfolios
   *
   * @returns Promise<PortfolioRow[]> - Array of published portfolios
   */
  async findPublished(): Promise<PortfolioRow[]> {
    return this.executeQueryArray(
      async () =>
        await this.supabase
          .from(this.tableName)
          .select("*")
          .eq("is_published", true)
          .order("published_at", { ascending: false }),
      "Failed to find published portfolios"
    );
  }

  /**
   * Find a published portfolio by username (through user_profiles join)
   *
   * @param username - Username to search for
   * @returns Promise<PortfolioRow | null> - Published portfolio or null if not found
   */
  async findPublishedByUsername(username: string): Promise<PortfolioRow | null> {
    const result = await this.executeQueryNullable<PortfolioWithUserProfile>(
      async () =>
        await this.supabase
          .from(this.tableName)
          .select(
            `
          *,
          user_profiles!inner(username)
        `
          )
          .eq("user_profiles.username", username)
          .eq("is_published", true)
          .single(),
      "Failed to find published portfolio by username",
      { username }
    );

    // Extract just the portfolio data, ignoring the joined user_profiles
    return result
      ? {
          id: result.id,
          user_id: result.user_id,
          title: result.title,
          description: result.description,
          is_published: result.is_published,
          published_at: result.published_at,
          created_at: result.created_at,
          updated_at: result.updated_at,
        }
      : null;
  }

  /**
   * Publish a portfolio
   *
   * @param portfolioId - Portfolio ID to publish
   * @returns Promise<PortfolioRow> - Updated portfolio with publish status
   */
  async publish(portfolioId: string): Promise<PortfolioRow> {
    return this.update(portfolioId, {
      is_published: true,
      published_at: new Date().toISOString(),
    });
  }

  /**
   * Unpublish a portfolio
   *
   * @param portfolioId - Portfolio ID to unpublish
   * @returns Promise<PortfolioRow> - Updated portfolio with unpublished status
   */
  async unpublish(portfolioId: string): Promise<PortfolioRow> {
    return this.update(portfolioId, {
      is_published: false,
      published_at: null,
    });
  }

  /**
   * Get portfolio with user profile information
   *
   * @param portfolioId - Portfolio ID to find
   * @returns Promise<{portfolio: PortfolioRow; username: string} | null> - Portfolio with username or null if not found
   */
  async findWithUsername(portfolioId: string): Promise<{ portfolio: PortfolioRow; username: string } | null> {
    const result = await this.executeQueryNullable<PortfolioWithUserProfile>(
      async () =>
        await this.supabase
          .from(this.tableName)
          .select(
            `
          *,
          user_profiles!inner(username)
        `
          )
          .eq("id", portfolioId)
          .single(),
      "Failed to find portfolio with username",
      { portfolioId }
    );

    if (!result) return null;

    return {
      portfolio: {
        id: result.id,
        user_id: result.user_id,
        title: result.title,
        description: result.description,
        is_published: result.is_published,
        published_at: result.published_at,
        created_at: result.created_at,
        updated_at: result.updated_at,
      },
      username: result.user_profiles.username,
    };
  }
}
