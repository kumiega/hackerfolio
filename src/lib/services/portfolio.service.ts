import type { SupabaseClient } from "@/db/supabase.client";
import type { PortfolioDto, CreatePortfolioCommand, UpdatePortfolioCommand, PublishStatusDto } from "@/types";
import { ERROR_CODES } from "@/lib/error-constants";

/**
 * Custom error class for portfolio-related errors
 */
class PortfolioError extends Error {
  userId?: string;

  constructor(code: string, userId?: string) {
    super(code);
    this.name = code;
    this.userId = userId;
  }
}

/**
 * Service for portfolio-related operations
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PortfolioService {
  /**
   * Retrieves the portfolio for a specific user
   *
   * @param supabase - Supabase client instance from context.locals
   * @param userId - ID of the user whose portfolio to retrieve
   * @returns Promise<PortfolioDto | null> - Portfolio data or null if not found
   * @throws PortfolioError with code 'PORTFOLIO_NOT_FOUND' if portfolio doesn't exist
   */
  static async getUserPortfolio(supabase: SupabaseClient, userId: string): Promise<PortfolioDto | null> {
    // Step 1: Query portfolios table for user's portfolio
    // RLS policy ensures user can only access their own portfolio
    const { data: portfolio, error } = await supabase
      .from("portfolios")
      .select("id, user_id, is_published, published_at, title, description, created_at")
      .eq("user_id", userId)
      .single();

    // Step 2: Handle database errors
    if (error) {
      // If no row found, return null (not an error)
      if (error.code === "PGRST116") {
        return null;
      }
      // For other errors, throw
      const dbError = new PortfolioError(ERROR_CODES.DATABASE_ERROR, userId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dbError as any).cause = error;
      throw dbError;
    }

    // Step 3: Return portfolio data
    return portfolio;
  }

  /**
   * Checks if a portfolio already exists for a specific user
   *
   * @param supabase - Supabase client instance from context.locals
   * @param userId - ID of the user to check for existing portfolio
   * @returns Promise<boolean> - True if portfolio exists, false otherwise
   * @throws PortfolioError with code 'DATABASE_ERROR' if database query fails
   */
  static async checkPortfolioExists(supabase: SupabaseClient, userId: string): Promise<boolean> {
    // Step 1: Query portfolios table for user's portfolio
    // Use count to efficiently check existence
    const { count, error } = await supabase
      .from("portfolios")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // Step 2: Handle database errors
    if (error) {
      const dbError = new PortfolioError("ERROR_CODES.DATABASE_ERROR", userId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dbError as any).cause = error;
      throw dbError;
    }

    // Step 3: Return existence status
    return (count || 0) > 0;
  }

  /**
   * Creates a new portfolio for a specific user
   *
   * @param supabase - Supabase client instance from context.locals
   * @param userId - ID of the user creating the portfolio
   * @param command - Portfolio creation command with title and optional description
   * @returns Promise<PortfolioDto> - Created portfolio data
   * @throws PortfolioError with code 'DATABASE_ERROR' if database insertion fails
   */
  static async createPortfolio(
    supabase: SupabaseClient,
    userId: string,
    command: CreatePortfolioCommand
  ): Promise<PortfolioDto> {
    // Step 1: Insert new portfolio record
    const { data: portfolio, error } = await supabase
      .from("portfolios")
      .insert({
        user_id: userId,
        title: command.title,
        description: command.description,
      })
      .select("id, user_id, is_published, published_at, title, description, created_at")
      .single();

    // Step 2: Handle database errors
    if (error) {
      const dbError = new PortfolioError("ERROR_CODES.DATABASE_ERROR", userId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dbError as any).cause = error;
      throw dbError;
    }

    // Step 3: Return created portfolio data
    return portfolio;
  }

  /**
   * Updates an existing portfolio for a specific user
   *
   * @param supabase - Supabase client instance from context.locals
   * @param portfolioId - ID of the portfolio to update
   * @param userId - ID of the user making the update (for ownership verification)
   * @param command - Portfolio update command with title and/or description
   * @returns Promise<PortfolioDto> - Updated portfolio data
   * @throws PortfolioError with code 'PORTFOLIO_NOT_FOUND' if portfolio doesn't exist or user doesn't own it
   * @throws PortfolioError with code 'DATABASE_ERROR' if database update fails
   */
  static async updatePortfolio(
    supabase: SupabaseClient,
    portfolioId: string,
    userId: string,
    command: UpdatePortfolioCommand
  ): Promise<PortfolioDto> {
    // Step 1: Update portfolio record with ownership verification
    // RLS policy ensures user can only update their own portfolio
    const { data: portfolio, error } = await supabase
      .from("portfolios")
      .update({
        title: command.title,
        description: command.description,
      })
      .eq("id", portfolioId)
      .eq("user_id", userId) // Additional ownership verification
      .select("id, user_id, is_published, published_at, title, description, created_at")
      .single();

    // Step 2: Handle database errors
    if (error) {
      // If no row found, portfolio doesn't exist or user doesn't own it
      if (error.code === "PGRST116") {
        throw new PortfolioError("ERROR_CODES.PORTFOLIO_NOT_FOUND", userId);
      }
      // For other errors, throw database error
      const dbError = new PortfolioError("ERROR_CODES.DATABASE_ERROR", userId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dbError as any).cause = error;
      throw dbError;
    }

    // Step 3: Return updated portfolio data
    return portfolio;
  }

  /**
   * Publishes a portfolio if it meets the minimum requirements
   *
   * @param supabase - Supabase client instance from context.locals
   * @param portfolioId - ID of the portfolio to publish
   * @param userId - ID of the user making the request (for ownership verification)
   * @returns Promise<PublishStatusDto> - Updated publication status
   * @throws PortfolioError with code 'PORTFOLIO_NOT_FOUND' if portfolio doesn't exist or user doesn't own it
   * @throws PortfolioError with code 'UNMET_REQUIREMENTS' if portfolio doesn't have required sections/components
   * @throws PortfolioError with code 'DATABASE_ERROR' if database operations fail
   */
  static async publishPortfolio(
    supabase: SupabaseClient,
    portfolioId: string,
    userId: string
  ): Promise<PublishStatusDto> {
    // Step 1: Validate portfolio ownership and check current status
    const { data: portfolio, error: portfolioError } = await supabase
      .from("portfolios")
      .select("id, user_id, is_published, published_at")
      .eq("id", portfolioId)
      .eq("user_id", userId)
      .single();

    if (portfolioError) {
      if (portfolioError.code === "PGRST116") {
        throw new PortfolioError("ERROR_CODES.PORTFOLIO_NOT_FOUND", userId);
      }
      const dbError = new PortfolioError("ERROR_CODES.DATABASE_ERROR", userId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dbError as any).cause = portfolioError;
      throw dbError;
    }

    // Step 2: Check if portfolio already published
    if (portfolio.is_published) {
      return {
        is_published: true,
        published_at: portfolio.published_at,
      };
    }

    // Step 3: Validate requirements - check for sections
    const { count: sectionCount, error: sectionError } = await supabase
      .from("sections")
      .select("*", { count: "exact", head: true })
      .eq("portfolio_id", portfolioId);

    if (sectionError) {
      const dbError = new PortfolioError("ERROR_CODES.DATABASE_ERROR", userId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dbError as any).cause = sectionError;
      throw dbError;
    }

    if ((sectionCount || 0) < 1) {
      throw new PortfolioError("ERROR_CODES.UNMET_REQUIREMENTS", userId);
    }

    // Step 4: Validate requirements - check for components across all sections
    const { data: sectionsData, error: sectionsDataError } = await supabase
      .from("sections")
      .select("id")
      .eq("portfolio_id", portfolioId);

    if (sectionsDataError) {
      const dbError = new PortfolioError("ERROR_CODES.DATABASE_ERROR", userId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dbError as any).cause = sectionsDataError;
      throw dbError;
    }

    const sectionIds = sectionsData?.map((s) => s.id) || [];

    const { count: componentCount, error: componentError } = await supabase
      .from("components")
      .select("*", { count: "exact", head: true })
      .in("section_id", sectionIds);

    if (componentError) {
      const dbError = new PortfolioError("ERROR_CODES.DATABASE_ERROR", userId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dbError as any).cause = componentError;
      throw dbError;
    }

    if ((componentCount || 0) < 1) {
      throw new PortfolioError("ERROR_CODES.UNMET_REQUIREMENTS", userId);
    }

    // Step 5: Update portfolio publication status
    const { data: updatedPortfolio, error: updateError } = await supabase
      .from("portfolios")
      .update({
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .eq("id", portfolioId)
      .eq("user_id", userId)
      .select("is_published, published_at")
      .single();

    if (updateError) {
      const dbError = new PortfolioError("ERROR_CODES.DATABASE_ERROR", userId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dbError as any).cause = updateError;
      throw dbError;
    }

    // Step 6: Return updated publication status
    return updatedPortfolio;
  }
}
