import { BaseRepository } from "./base.repository";
import { AppError } from "@/lib/error-handler";
import type { PortfolioDto } from "@/types";

// Temporary type definitions until Database types are regenerated
type PortfolioRow = PortfolioDto;
type PortfolioInsert = Omit<PortfolioDto, "id" | "created_at" | "updated_at" | "last_published_at">;
type PortfolioUpdate = Partial<Pick<PortfolioDto, "draft_data" | "published_data" | "last_published_at">>;

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
   * Find all published portfolios (portfolios with non-null published_data)
   *
   * @returns Promise<PortfolioRow[]> - Array of published portfolios
   */
  async findPublished(): Promise<PortfolioRow[]> {
    return this.executeQueryArray(
      async () =>
        await this.supabase
          .from(this.tableName)
          .select("*")
          .not("published_data", "is", null)
          .order("last_published_at", { ascending: false }),
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
          .select("*, user_profiles!inner(username)")
          .eq("user_profiles.username", username)
          .not("published_data", "is", null)
          .single(),
      "Failed to find published portfolio by username",
      { username }
    );

    // Return the full portfolio row (now includes draft_data and published_data)
    return result
      ? {
          id: result.id,
          user_id: result.user_id,
          draft_data: result.draft_data,
          published_data: result.published_data,
          last_published_at: result.last_published_at,
          created_at: result.created_at,
          updated_at: result.updated_at,
        }
      : null;
  }

  /**
   * Publish a portfolio by calling the database function
   * This function validates requirements (≥1 section, ≥1 component) and copies draft_data to published_data
   *
   * @param portfolioId - Portfolio ID to publish
   * @param userId - User ID for ownership verification
   * @returns Promise<PortfolioRow> - Updated portfolio with published_data
   */
  async publish(portfolioId: string, userId: string): Promise<PortfolioRow> {
    // First check ownership at application level
    const portfolio = await this.findById(portfolioId);
    if (!portfolio) {
      throw new AppError("PORTFOLIO_NOT_FOUND", "Portfolio not found", {
        portfolioId,
        userId,
      });
    }

    if (portfolio.user_id !== userId) {
      throw new AppError("PORTFOLIO_NOT_FOUND", "Portfolio not found or access denied", {
        portfolioId,
        userId,
      });
    }

    // Call the database function to publish (with additional ownership check for defense in depth)
    const { data, error } = await this.supabase.rpc("publish_portfolio", {
      portfolio_id: portfolioId,
    });

    if (error) {
      // Handle specific PostgreSQL exceptions from the publish_portfolio function
      if (error.message?.includes("Portfolio must have at least 1 section")) {
        throw new AppError("UNMET_REQUIREMENTS", "Portfolio must have at least 1 section to publish", {
          portfolioId,
          userId,
        });
      }
      if (error.message?.includes("Portfolio must have at least 1 component")) {
        throw new AppError("UNMET_REQUIREMENTS", "Portfolio must have at least 1 component to publish", {
          portfolioId,
          userId,
        });
      }
      // Also check for the full message with parentheses
      if (error.message?.includes("Portfolio must have at least 1 component (in sections or bio)")) {
        throw new AppError("UNMET_REQUIREMENTS", "Portfolio must have at least 1 component to publish", {
          portfolioId,
          userId,
        });
      }

      throw new AppError("DATABASE_ERROR", "Failed to publish portfolio via DB function", {
        portfolioId,
        userId,
        cause: error,
      });
    }

    if (!data) {
      throw new AppError("DATABASE_ERROR", "No data returned from publish function", { portfolioId, userId });
    }

    return data as PortfolioRow;
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
          .select("*, user_profiles!inner(username)")
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
        draft_data: result.draft_data,
        published_data: result.published_data,
        created_at: result.created_at,
        updated_at: result.updated_at,
        last_published_at: result.last_published_at,
      },
      username: result.user_profiles.username,
    };
  }
}
