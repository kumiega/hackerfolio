import type { SupabaseClient } from "@/db/supabase.client";
import { AppError } from "@/lib/error-handler";
import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Base repository class providing common database operations
 *
 * This class provides a foundation for all data access operations with:
 * - Type-safe database interactions
 * - Consistent error handling
 * - Common CRUD operations
 * - Row Level Security (RLS) compliance
 */
export abstract class BaseRepository {
  protected readonly supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Executes a database operation with consistent error handling
   *
   * @param operation - Database operation to execute
   * @param errorMessage - Custom error message for operation failures
   * @param context - Additional context for error logging
   * @returns Promise<T> - Result of the operation
   * @throws AppError with code 'DATABASE_ERROR' for database operation failures
   */
  protected async executeQuery<T>(
    operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
    errorMessage: string,
    context?: Record<string, unknown>
  ): Promise<T> {
    try {
      const { data, error } = await operation();

      if (error) {
        throw new AppError("DATABASE_ERROR", errorMessage, {
          cause: error,
          ...context,
        });
      }

      if (data === null) {
        throw new AppError("DATABASE_ERROR", `${errorMessage}: No data returned`, context);
      }

      return data;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("DATABASE_ERROR", errorMessage, {
        cause: error as Error,
        ...context,
      });
    }
  }

  /**
   * Executes a database operation that may return null (e.g., find operations)
   *
   * @param operation - Database operation to execute
   * @param errorMessage - Custom error message for operation failures
   * @param context - Additional context for error logging
   * @returns Promise<T | null> - Result of the operation or null
   * @throws AppError with code 'DATABASE_ERROR' for database operation failures
   */
  protected async executeQueryNullable<T>(
    operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
    errorMessage: string,
    context?: Record<string, unknown>
  ): Promise<T | null> {
    try {
      const { data, error } = await operation();

      if (error) {
        // Handle "not found" as successful null result
        if (this.isNotFoundError(error)) {
          return null;
        }

        throw new AppError("DATABASE_ERROR", errorMessage, {
          cause: error,
          ...context,
        });
      }

      return data;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("DATABASE_ERROR", errorMessage, {
        cause: error as Error,
        ...context,
      });
    }
  }

  /**
   * Executes a database operation that returns an array
   *
   * @param operation - Database operation to execute
   * @param errorMessage - Custom error message for operation failures
   * @param context - Additional context for error logging
   * @returns Promise<T[]> - Array result of the operation
   * @throws AppError with code 'DATABASE_ERROR' for database operation failures
   */
  protected async executeQueryArray<T>(
    operation: () => Promise<{ data: T[] | null; error: PostgrestError | null }>,
    errorMessage: string,
    context?: Record<string, unknown>
  ): Promise<T[]> {
    try {
      const { data, error } = await operation();

      if (error) {
        throw new AppError("DATABASE_ERROR", errorMessage, {
          cause: error,
          ...context,
        });
      }

      return data ?? [];
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("DATABASE_ERROR", errorMessage, {
        cause: error as Error,
        ...context,
      });
    }
  }

  /**
   * Checks if a database error indicates "not found" (PGRST116)
   *
   * @param error - Database error object
   * @returns boolean - True if error indicates record not found
   */
  protected isNotFoundError(error: PostgrestError | null): boolean {
    return error?.code === "PGRST116";
  }
}

/**
 * Generic CRUD repository interface
 */
export interface CrudRepository<T, TInsert = Partial<T>, TUpdate = Partial<T>> {
  /**
   * Find a record by ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find all records matching criteria
   */
  findAll(criteria?: Partial<T>): Promise<T[]>;

  /**
   * Create a new record
   */
  create(data: TInsert): Promise<T>;

  /**
   * Update an existing record
   */
  update(id: string, data: TUpdate): Promise<T>;

  /**
   * Delete a record by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a record exists by ID
   */
  exists(id: string): Promise<boolean>;
}
