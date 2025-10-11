import type { SupabaseClient } from "@/db/supabase.client";
import type { PortfolioDto, CreatePortfolioCommand } from "@/types";

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
      const dbError = new PortfolioError("DATABASE_ERROR", userId);
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
      const dbError = new PortfolioError("DATABASE_ERROR", userId);
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
      const dbError = new PortfolioError("DATABASE_ERROR", userId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dbError as any).cause = error;
      throw dbError;
    }

    // Step 3: Return created portfolio data
    return portfolio;
  }
}
