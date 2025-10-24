import type { SupabaseClient } from "@/db/supabase.client";
import type {
  PortfolioDto,
  CreatePortfolioCommand,
  UpdatePortfolioCommand,
  PublishStatusDto,
  PublicPortfolioDto,
} from "@/types";
import { ERROR_CODES } from "@/lib/error-constants";
import { AppError } from "@/lib/error-handler";
import { repositories } from "@/lib/repositories";

/**
 * Service for portfolio-related operations
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PortfolioService {
  /**
   * Retrieves the portfolio for a specific user
   *
   * @param userId - ID of the user whose portfolio to retrieve
   * @returns Promise<PortfolioDto | null> - Portfolio data or null if not found
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
    return await repositories.portfolios.exists(userId);
  }

  /**
   * Creates a new portfolio for a specific user
   *
   * @param userId - ID of the user creating the portfolio
   * @param command - Portfolio creation command with title and optional description
   * @returns Promise<PortfolioDto> - Created portfolio data
   * @throws PortfolioError with code 'DATABASE_ERROR' if database insertion fails
   */
  static async createPortfolio(userId: string, command: CreatePortfolioCommand): Promise<PortfolioDto> {
    // Step 1: Insert new portfolio record using repository
    return await repositories.portfolios.create({
      user_id: userId,
      title: command.title,
      description: command.description,
    });
  }

  /**
   * Updates an existing portfolio for a specific user
   *
   * @param portfolioId - ID of the portfolio to update
   * @param userId - ID of the user making the update (for ownership verification)
   * @param command - Portfolio update command with title and/or description
   * @returns Promise<PortfolioDto> - Updated portfolio data
   * @throws PortfolioError with code 'PORTFOLIO_NOT_FOUND' if portfolio doesn't exist or user doesn't own it
   * @throws PortfolioError with code 'DATABASE_ERROR' if database update fails
   */
  static async updatePortfolio(
    portfolioId: string,
    userId: string,
    command: UpdatePortfolioCommand
  ): Promise<PortfolioDto> {
    // Step 1: Update portfolio record with ownership verification
    // RLS policy ensures user can only update their own portfolio
    return await repositories.portfolios.update(portfolioId, {
      title: command.title,
      description: command.description,
    });
  }

  /**
   * Publishes a portfolio if it meets the minimum requirements
   *
   * @param portfolioId - ID of the portfolio to publish
   * @param userId - ID of the user making the request (for ownership verification)
   * @returns Promise<PublishStatusDto> - Updated publication status
   * @throws PortfolioError with code 'PORTFOLIO_NOT_FOUND' if portfolio doesn't exist or user doesn't own it
   * @throws PortfolioError with code 'UNMET_REQUIREMENTS' if portfolio doesn't have required sections/components
   * @throws PortfolioError with code 'DATABASE_ERROR' if database operations fail
   */
  static async publishPortfolio(portfolioId: string, userId: string): Promise<PublishStatusDto> {
    // Step 1: Validate portfolio ownership and check current status
    const portfolio = await repositories.portfolios.findById(portfolioId);

    if (!portfolio || portfolio.user_id !== userId) {
      throw new AppError(ERROR_CODES.PORTFOLIO_NOT_FOUND, undefined, { userId });
    }

    // Step 2: Check if portfolio already published
    if (portfolio.is_published) {
      return {
        is_published: true,
        published_at: portfolio.published_at,
      };
    }

    // Step 3: Validate requirements - check for sections
    const sections = await repositories.sections.findByPortfolioId(portfolioId);

    if (sections.length === 0) {
      throw new AppError(ERROR_CODES.UNMET_REQUIREMENTS, undefined, {
        userId,
        details: "Portfolio must have at least one section to be published",
      });
    }

    // Step 4: Validate requirements - check for components
    const components = await repositories.components.findByPortfolioId(portfolioId);

    if (components.length === 0) {
      throw new AppError(ERROR_CODES.UNMET_REQUIREMENTS, undefined, {
        userId,
        details: "Portfolio must have at least one component to be published",
      });
    }

    // Step 5: Publish the portfolio
    const updatedPortfolio = await repositories.portfolios.publish(portfolioId);

    // Step 6: Return updated publication status
    return {
      is_published: updatedPortfolio.is_published,
      published_at: updatedPortfolio.published_at,
    };
  }

  /**
   * Unpublishes a portfolio by setting is_published to false and clearing published_at
   *
   * @param portfolioId - ID of the portfolio to unpublish
   * @param userId - ID of the user making the request (for ownership verification)
   * @returns Promise<PublishStatusDto> - Updated publication status
   * @throws PortfolioError with code 'PORTFOLIO_NOT_FOUND' if portfolio doesn't exist or user doesn't own it
   * @throws PortfolioError with code 'DATABASE_ERROR' if database operations fail
   */
  static async unpublishPortfolio(portfolioId: string, userId: string): Promise<PublishStatusDto> {
    // Step 1: Validate portfolio ownership and check current status
    const portfolio = await repositories.portfolios.findById(portfolioId);

    if (!portfolio || portfolio.user_id !== userId) {
      throw new AppError(ERROR_CODES.PORTFOLIO_NOT_FOUND, undefined, { userId });
    }

    // Step 2: Check if portfolio already unpublished
    if (!portfolio.is_published) {
      return {
        is_published: false,
        published_at: null,
      };
    }

    // Step 3: Unpublish the portfolio
    const updatedPortfolio = await repositories.portfolios.unpublish(portfolioId);

    // Step 4: Return updated publication status
    return {
      is_published: updatedPortfolio.is_published,
      published_at: updatedPortfolio.published_at,
    };
  }

  /**
   * Retrieves a published portfolio with sections and components by username
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
    // Step 1: Query portfolio with user profile, sections, and components in a single optimized query
    // Only return published portfolios with visible sections
    const { data, error } = await supabaseService
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

    // Step 3: Transform data to match PublicPortfolioDto structure
    // The query returns nested data, we need to restructure it
    const portfolio = data;

    // Extract username from the joined user_profiles
    const profileUsername = Array.isArray(portfolio.user_profiles)
      ? portfolio.user_profiles[0]?.username
      : portfolio.user_profiles?.username;

    // Transform sections to include components
    const sections = Array.isArray(portfolio.sections)
      ? portfolio.sections.map((section) => ({
          id: section.id,
          name: section.name,
          position: section.position,
          visible: section.visible,
          components: Array.isArray(section.components) ? section.components : [section.components].filter(Boolean),
        }))
      : [];

    // Step 4: Return formatted public portfolio data
    return {
      username: profileUsername,
      portfolio: {
        title: portfolio.title,
        description: portfolio.description,
        published_at: portfolio.published_at,
      },
      sections,
    };
  }
}
