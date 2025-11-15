import type { SupabaseClient } from "@/db/supabase.client";
import type {
  PortfolioDto,
  CreatePortfolioCommand,
  UpdatePortfolioCommand,
  PublishStatusDto,
  PublicPortfolioDto,
  PreviewPortfolioDto,
} from "@/types";
import { ERROR_CODES } from "@/lib/error-constants";
import { AppError } from "@/lib/error-handler";
import { repositories } from "@/lib/repositories";

/**
 * Service for portfolio-related operations with JSONB structure
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PortfolioService {
  /**
   * Retrieves the portfolio (with draft_data) for a specific user
   *
   * @param userId - ID of the user whose portfolio to retrieve
   * @returns Promise<PortfolioDto | null> - Portfolio data with draft_data or null if not found
   * @throws PortfolioError with code 'PORTFOLIO_NOT_FOUND' if portfolio doesn't exist
   */
  static async getUserPortfolio(userId: string): Promise<PortfolioDto | null> {
    // Step 1: Query portfolios table for user's portfolio
    // RLS policy ensures user can only access their own portfolio
    return await repositories.portfolios.findByUserId(userId);
  }

  /**
   * Checks if a portfolio already exists for a specific user
   *
   * @param userId - ID of the user to check for existing portfolio
   * @returns Promise<boolean> - True if portfolio exists, false otherwise
   * @throws PortfolioError with code 'DATABASE_ERROR' if database query fails
   */
  static async checkPortfolioExists(userId: string): Promise<boolean> {
    // Step 1: Query portfolios table for user's portfolio
    // Use repository method to check existence
    return await repositories.portfolios.userHasPortfolio(userId);
  }

  /**
   * Creates a new portfolio for a specific user with empty draft_data
   *
   * @param userId - ID of the user creating the portfolio
   * @param command - Portfolio creation command with optional draft_data
   * @returns Promise<PortfolioDto> - Created portfolio data
   * @throws PortfolioError with code 'DATABASE_ERROR' if database insertion fails
   */
  static async createPortfolio(userId: string, command: CreatePortfolioCommand): Promise<PortfolioDto> {
    // Step 1: Insert new portfolio record with default or provided draft_data
    return await repositories.portfolios.create({
      user_id: userId,
      draft_data: command.draft_data || { sections: [] },
    });
  }

  /**
   * Updates an existing portfolio's draft_data
   *
   * @param portfolioId - ID of the portfolio to update
   * @param userId - ID of the user making the update (for ownership verification)
   * @param command - Portfolio update command with draft_data
   * @returns Promise<PortfolioDto> - Updated portfolio data
   * @throws PortfolioError with code 'PORTFOLIO_NOT_FOUND' if portfolio doesn't exist or user doesn't own it
   * @throws PortfolioError with code 'VALIDATION_ERROR' if draft_data exceeds limits
   * @throws PortfolioError with code 'DATABASE_ERROR' if database update fails
   */
  static async updatePortfolio(
    portfolioId: string,
    userId: string,
    command: UpdatePortfolioCommand
  ): Promise<PortfolioDto> {
    // Step 1: Get existing portfolio to merge with
    const existingPortfolio = await repositories.portfolios.findById(portfolioId);
    if (!existingPortfolio) {
      throw new AppError(ERROR_CODES.PORTFOLIO_NOT_FOUND, "Portfolio not found", {
        portfolioId,
        userId,
      });
    }

    // Step 2: Verify ownership
    if (existingPortfolio.user_id !== userId) {
      throw new AppError(ERROR_CODES.PORTFOLIO_NOT_FOUND, "Portfolio not found or access denied", {
        portfolioId,
        userId,
      });
    }

    // Step 3: Merge partial update with existing data
    const mergedDraftData = {
      ...existingPortfolio.draft_data,
      ...command.draft_data,
    };

    // Step 4: Validate limits (max 10 sections, max 15 components total)
    const { sections } = mergedDraftData;

    if (sections.length > 10) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, undefined, {
        userId,
        details: "Maximum 10 sections allowed per portfolio",
      });
    }

    const sectionComponents = sections.reduce((sum, section) => sum + section.components.length, 0);

    if (sectionComponents > 15) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, undefined, {
        userId,
        details: "Maximum 15 components allowed per portfolio",
      });
    }

    // Step 4: Update portfolio draft_data with ownership verification
    // RLS policy ensures user can only update their own portfolio
    return await repositories.portfolios.update(portfolioId, {
      draft_data: mergedDraftData,
    });
  }

  /**
   * Publishes a portfolio by copying draft_data to published_data
   * Uses database function that validates requirements (≥1 section, ≥1 component)
   *
   * @param portfolioId - ID of the portfolio to publish
   * @param userId - ID of the user making the request (for ownership verification)
   * @returns Promise<PublishStatusDto> - Published portfolio data
   * @throws PortfolioError with code 'PORTFOLIO_NOT_FOUND' if portfolio doesn't exist or user doesn't own it
   * @throws PortfolioError with code 'UNMET_REQUIREMENTS' if portfolio doesn't meet publish requirements
   * @throws PortfolioError with code 'DATABASE_ERROR' if database operations fail
   */
  static async publishPortfolio(portfolioId: string, userId: string): Promise<PublishStatusDto> {
    // Step 1: Call database function to publish portfolio
    // Repository handles ownership verification, then calls DB function for validation and publishing
    const publishedPortfolio = await repositories.portfolios.publish(portfolioId, userId);

    // Step 2: Return only the required fields for PublishStatusDto
    if (!publishedPortfolio.published_data || !publishedPortfolio.last_published_at) {
      throw new PortfolioError("DATABASE_ERROR", "Published portfolio missing required data");
    }

    return {
      id: publishedPortfolio.id,
      published_data: publishedPortfolio.published_data,
      last_published_at: publishedPortfolio.last_published_at,
    };
  }

  /**
   * Retrieves a published portfolio (published_data) by username
   * for server-side rendering (SSR). This method uses service role client to bypass RLS.
   *
   * @param supabaseService - Service role Supabase client instance (bypasses RLS)
   * @param username - Username of the portfolio owner
   * @returns Promise<PublicPortfolioDto | null> - Public portfolio data or null if not found/published
   * @throws AppError with code 'DATABASE_ERROR' if database query fails
   */
  static async getPublicPortfolioByUsername(
    supabaseService: SupabaseClient,
    username: string
  ): Promise<PublicPortfolioDto | null> {
    // Step 1: Query portfolio with published_data by username
    const { data, error } = await supabaseService
      .from("portfolios")
      .select(
        `
        published_data,
        last_published_at,
        user_profiles!inner(username)
      `
      )
      .eq("user_profiles.username", username)
      .not("published_data", "is", null)
      .single();

    // Step 2: Handle database errors
    if (error) {
      // If no row found, return null (portfolio not published or doesn't exist)
      if (error.code === "PGRST116") {
        return null;
      }
      // For other errors, throw
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        details: { username },
        cause: error,
      });
    }

    // Step 3: Extract username from joined user_profiles
    const profileUsername = Array.isArray(data.user_profiles)
      ? data.user_profiles[0]?.username
      : data.user_profiles?.username;

    // Step 4: Return formatted public portfolio data
    return {
      username: profileUsername,
      published_data: data.published_data,
      last_published_at: data.last_published_at,
    };
  }

  /**
   * Retrieves a draft portfolio (draft_data) by username for preview
   * Only accessible by the portfolio owner (requires authentication)
   *
   * @param supabase - Authenticated Supabase client instance
   * @param username - Username of the portfolio owner
   * @param userId - ID of the authenticated user (for ownership verification)
   * @returns Promise<PreviewPortfolioDto | null> - Preview portfolio data or null if not found
   * @throws AppError with code 'FORBIDDEN' if user doesn't own the portfolio
   * @throws AppError with code 'DATABASE_ERROR' if database query fails
   */
  static async getPreviewPortfolioByUsername(
    supabase: SupabaseClient,
    username: string,
    userId: string
  ): Promise<PreviewPortfolioDto | null> {
    // Step 1: Query portfolio with draft_data by username
    const { data, error } = await supabase
      .from("portfolios")
      .select(
        `
        draft_data,
        updated_at,
        user_id,
        user_profiles!inner(username),
        last_published_at,
        published_data
      `
      )
      .eq("user_profiles.username", username)
      .single();

    // Step 2: Handle database errors
    if (error) {
      // If no row found, return null
      if (error.code === "PGRST116") {
        return null;
      }
      // For other errors, throw
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        details: { username },
        cause: error,
      });
    }

    // Step 3: Verify ownership
    if (data.user_id !== userId) {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, undefined, {
        userId,
        details: "You can only preview your own portfolio",
      });
    }

    // Step 4: Extract username
    const profileUsername = Array.isArray(data.user_profiles)
      ? data.user_profiles[0]?.username
      : data.user_profiles?.username;

    // Step 5: Return formatted preview portfolio data
    return {
      username: profileUsername,
      draft_data: data.draft_data,
      updated_at: data.updated_at,
      has_published: !!data.published_data,
      last_published_at: data.last_published_at,
    };
  }
}
