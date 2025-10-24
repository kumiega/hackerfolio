import type { Database } from "@/db/database.types";
import { BaseRepository } from "./base.repository";

type AppErrorRow = Database["public"]["Tables"]["app_errors"]["Row"];
type AppErrorInsert = Database["public"]["Tables"]["app_errors"]["Insert"];
type ErrorSeverity = Database["public"]["Enums"]["error_severity"];
type ErrorSource = Database["public"]["Enums"]["error_source"];

/**
 * Repository for application error logging data access operations
 *
 * Handles all database operations related to error logging including:
 * - Error logging and retrieval
 * - Error filtering and searching
 * - Error cleanup operations
 */
export class AppErrorRepository extends BaseRepository {
  private readonly tableName = "app_errors";

  /**
   * Log a new application error
   *
   * @param error - Error data to insert
   * @returns Promise<AppErrorRow> - Created error record
   */
  async logError(error: AppErrorInsert): Promise<AppErrorRow> {
    return this.executeQuery(
      async () => await this.supabase.from(this.tableName).insert(error).select("*").single(),
      "Failed to log application error",
      { error }
    );
  }

  /**
   * Find an error by ID
   *
   * @param errorId - Error ID to search for
   * @returns Promise<AppErrorRow | null> - Error record or null if not found
   */
  async findById(errorId: number): Promise<AppErrorRow | null> {
    return this.executeQueryNullable(
      async () => await this.supabase.from(this.tableName).select("*").eq("id", errorId).single(),
      "Failed to find error by ID",
      { errorId }
    );
  }

  /**
   * Find errors by user ID
   *
   * @param userId - User ID to find errors for
   * @param limit - Maximum number of errors to return (default: 50)
   * @returns Promise<AppErrorRow[]> - Array of error records
   */
  async findByUserId(userId: string, limit = 50): Promise<AppErrorRow[]> {
    return this.executeQueryArray(
      async () =>
        await this.supabase
          .from(this.tableName)
          .select("*")
          .eq("user_id", userId)
          .order("occurred_at", { ascending: false })
          .limit(limit),
      "Failed to find errors by user ID",
      { userId, limit }
    );
  }

  /**
   * Find errors by portfolio ID
   *
   * @param portfolioId - Portfolio ID to find errors for
   * @param limit - Maximum number of errors to return (default: 50)
   * @returns Promise<AppErrorRow[]> - Array of error records
   */
  async findByPortfolioId(portfolioId: string, limit = 50): Promise<AppErrorRow[]> {
    return this.executeQueryArray(
      async () =>
        await this.supabase
          .from(this.tableName)
          .select("*")
          .eq("portfolio_id", portfolioId)
          .order("occurred_at", { ascending: false })
          .limit(limit),
      "Failed to find errors by portfolio ID",
      { portfolioId, limit }
    );
  }

  /**
   * Find errors by severity level
   *
   * @param severity - Severity level to filter by
   * @param limit - Maximum number of errors to return (default: 100)
   * @returns Promise<AppErrorRow[]> - Array of error records
   */
  async findBySeverity(severity: ErrorSeverity, limit = 100): Promise<AppErrorRow[]> {
    return this.executeQueryArray(
      async () =>
        await this.supabase
          .from(this.tableName)
          .select("*")
          .eq("severity", severity)
          .order("occurred_at", { ascending: false })
          .limit(limit),
      "Failed to find errors by severity",
      { severity, limit }
    );
  }

  /**
   * Find errors by source
   *
   * @param source - Error source to filter by
   * @param limit - Maximum number of errors to return (default: 100)
   * @returns Promise<AppErrorRow[]> - Array of error records
   */
  async findBySource(source: ErrorSource, limit = 100): Promise<AppErrorRow[]> {
    return this.executeQueryArray(
      async () =>
        await this.supabase
          .from(this.tableName)
          .select("*")
          .eq("source", source)
          .order("occurred_at", { ascending: false })
          .limit(limit),
      "Failed to find errors by source",
      { source, limit }
    );
  }

  /**
   * Find recent errors across all sources
   *
   * @param limit - Maximum number of errors to return (default: 100)
   * @param minSeverity - Minimum severity level to include (default: "warn")
   * @returns Promise<AppErrorRow[]> - Array of recent error records
   */
  async findRecentErrors(limit = 100, minSeverity: ErrorSeverity = "warn"): Promise<AppErrorRow[]> {
    const severityOrder: Record<ErrorSeverity, number> = {
      debug: 1,
      info: 2,
      warn: 3,
      error: 4,
      fatal: 5,
    };

    const minSeverityValue = severityOrder[minSeverity];

    return this.executeQueryArray(
      async () =>
        await this.supabase
          .from(this.tableName)
          .select("*")
          .gte("severity", minSeverityValue)
          .order("occurred_at", { ascending: false })
          .limit(limit),
      "Failed to find recent errors",
      { limit, minSeverity }
    );
  }

  /**
   * Find errors by request ID (for tracing related errors)
   *
   * @param requestId - Request ID to find errors for
   * @returns Promise<AppErrorRow[]> - Array of error records for the request
   */
  async findByRequestId(requestId: string): Promise<AppErrorRow[]> {
    return this.executeQueryArray(
      async () =>
        await this.supabase
          .from(this.tableName)
          .select("*")
          .eq("request_id", requestId)
          .order("occurred_at", { ascending: true }),
      "Failed to find errors by request ID",
      { requestId }
    );
  }

  /**
   * Find errors by session ID
   *
   * @param sessionId - Session ID to find errors for
   * @param limit - Maximum number of errors to return (default: 50)
   * @returns Promise<AppErrorRow[]> - Array of error records
   */
  async findBySessionId(sessionId: string, limit = 50): Promise<AppErrorRow[]> {
    return this.executeQueryArray(
      async () =>
        await this.supabase
          .from(this.tableName)
          .select("*")
          .eq("session_id", sessionId)
          .order("occurred_at", { ascending: false })
          .limit(limit),
      "Failed to find errors by session ID",
      { sessionId, limit }
    );
  }

  /**
   * Search errors by message content
   *
   * @param searchTerm - Term to search for in error messages
   * @param limit - Maximum number of errors to return (default: 50)
   * @returns Promise<AppErrorRow[]> - Array of matching error records
   */
  async searchByMessage(searchTerm: string, limit = 50): Promise<AppErrorRow[]> {
    return this.executeQueryArray(
      async () =>
        await this.supabase
          .from(this.tableName)
          .select("*")
          .ilike("message", `%${searchTerm}%`)
          .order("occurred_at", { ascending: false })
          .limit(limit),
      "Failed to search errors by message",
      { searchTerm, limit }
    );
  }

  /**
   * Get error statistics by severity
   *
   * @param since - ISO date string to get stats since (default: 24 hours ago)
   * @returns Promise<Record<ErrorSeverity, number>> - Count of errors by severity
   */
  async getErrorStatsBySeverity(since?: string): Promise<Record<ErrorSeverity, number>> {
    const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const result = await this.executeQueryArray(
      async () => await this.supabase.from(this.tableName).select("severity").gte("occurred_at", sinceDate),
      "Failed to get error statistics",
      { sinceDate }
    );

    const stats: Record<ErrorSeverity, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    };

    result.forEach((error) => {
      stats[error.severity]++;
    });

    return stats;
  }

  /**
   * Get error statistics by source
   *
   * @param since - ISO date string to get stats since (default: 24 hours ago)
   * @returns Promise<Record<ErrorSource, number>> - Count of errors by source
   */
  async getErrorStatsBySource(since?: string): Promise<Record<ErrorSource, number>> {
    const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const result = await this.executeQueryArray(
      async () => await this.supabase.from(this.tableName).select("source").gte("occurred_at", sinceDate),
      "Failed to get error statistics by source",
      { sinceDate }
    );

    const stats: Record<ErrorSource, number> = {
      frontend: 0,
      api: 0,
      edge: 0,
      worker: 0,
      db: 0,
      other: 0,
    };

    result.forEach((error) => {
      stats[error.source]++;
    });

    return stats;
  }

  /**
   * Clean up old error records (typically called by a scheduled function)
   *
   * @param retainDays - Number of days of errors to retain (default: 30)
   * @returns Promise<number> - Number of records deleted
   */
  async cleanupOldErrors(retainDays = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - retainDays * 24 * 60 * 60 * 1000).toISOString();

    const result = await this.executeQueryNullable(
      async () => await this.supabase.rpc("app_errors_cleanup", { retain_days: retainDays }),
      "Failed to cleanup old errors",
      { retainDays, cutoffDate }
    );

    return result ?? 0;
  }
}
