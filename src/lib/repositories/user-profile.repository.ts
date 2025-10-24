import type { Database } from "@/db/database.types";
import { BaseRepository } from "./base.repository";

type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];
type UserProfileInsert = Database["public"]["Tables"]["user_profiles"]["Insert"];
type UserProfileUpdate = Database["public"]["Tables"]["user_profiles"]["Update"];

/**
 * Repository for user profile data access operations
 *
 * Handles all database operations related to user profiles including:
 * - Profile creation and retrieval
 * - Username management
 * - Profile updates
 * - Username availability checks
 */
export class UserProfileRepository extends BaseRepository {
  private readonly tableName = "user_profiles";

  /**
   * Find a user profile by ID
   *
   * @param userId - User ID to search for
   * @returns Promise<UserProfileRow | null> - User profile or null if not found
   */
  async findById(userId: string): Promise<UserProfileRow | null> {
    return this.executeQueryNullable(
      async () => {
        const { data, error } = await this.supabase.from(this.tableName).select("*").eq("id", userId).limit(1);
        return { data: data?.[0] || null, error };
      },
      "Failed to find user profile",
      { userId }
    );
  }

  /**
   * Find a user profile by username
   *
   * @param username - Username to search for (case-insensitive)
   * @returns Promise<UserProfileRow | null> - User profile or null if not found
   */
  async findByUsername(username: string): Promise<UserProfileRow | null> {
    return this.executeQueryNullable(
      async () => await this.supabase.from(this.tableName).select("*").ilike("username", username).single(),
      "Failed to find user profile by username",
      { username }
    );
  }

  /**
   * Create a new user profile
   *
   * @param profile - Profile data to insert
   * @returns Promise<UserProfileRow> - Created user profile
   */
  async create(profile: UserProfileInsert): Promise<UserProfileRow> {
    return this.executeQuery(
      async () => await this.supabase.from(this.tableName).insert(profile).select("*").single(),
      "Failed to create user profile",
      { profile }
    );
  }

  /**
   * Update an existing user profile
   *
   * @param userId - User ID to update
   * @param updates - Fields to update
   * @returns Promise<UserProfileRow> - Updated user profile
   */
  async update(userId: string, updates: UserProfileUpdate): Promise<UserProfileRow> {
    return this.executeQuery(
      async () => await this.supabase.from(this.tableName).update(updates).eq("id", userId).select("*").single(),
      "Failed to update user profile",
      { userId, updates }
    );
  }

  /**
   * Check if a username is available (case-insensitive)
   *
   * @param username - Username to check
   * @param excludeUserId - Optional user ID to exclude from the check (for updates)
   * @returns Promise<boolean> - True if username is available
   */
  async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    const query = this.supabase.from(this.tableName).select("id").ilike("username", username).limit(1);

    if (excludeUserId) {
      query.neq("id", excludeUserId);
    }

    const result = await this.executeQueryArray(async () => await query, "Failed to check username availability", {
      username,
      excludeUserId,
    });

    return result.length === 0;
  }

  /**
   * Claim a username for a user (sets username if not already set)
   *
   * @param userId - User ID claiming the username
   * @param username - Username to claim
   * @returns Promise<UserProfileRow> - Updated user profile
   */
  async claimUsername(userId: string, username: string): Promise<UserProfileRow> {
    // First check if user already has a username
    const existingProfile = await this.findById(userId);
    if (!existingProfile) {
      throw new Error(`User profile not found for user ${userId}`);
    }

    if (existingProfile.username) {
      throw new Error(`User ${userId} already has a username set`);
    }

    // Check username availability
    const isAvailable = await this.isUsernameAvailable(username);
    if (!isAvailable) {
      throw new Error(`Username ${username} is already taken`);
    }

    // Update the profile with the new username
    return this.update(userId, { username });
  }

  /**
   * Delete a user profile by ID
   *
   * @param userId - User ID to delete
   * @returns Promise<void>
   */
  async delete(userId: string): Promise<void> {
    await this.executeQuery(
      async () => await this.supabase.from(this.tableName).delete().eq("id", userId),
      "Failed to delete user profile",
      { userId }
    );
  }

  /**
   * Check if a user profile exists by ID
   *
   * @param userId - User ID to check
   * @returns Promise<boolean> - True if profile exists
   */
  async exists(userId: string): Promise<boolean> {
    const result = await this.executeQueryNullable(
      async () => await this.supabase.from(this.tableName).select("id").eq("id", userId).single(),
      "Failed to check user profile existence",
      { userId }
    );

    return result !== null;
  }

  /**
   * Get a user profile with selected fields only
   *
   * @param userId - User ID to find
   * @param fields - Comma-separated list of fields to select
   * @returns Promise<Partial<UserProfileRow> | null> - Partial user profile or null if not found
   */
  async findByIdWithFields(userId: string, fields: string): Promise<Partial<UserProfileRow> | null> {
    return this.executeQueryNullable(
      async () => await this.supabase.from(this.tableName).select(fields).eq("id", userId).single(),
      "Failed to find user profile with selected fields",
      { userId, fields }
    );
  }
}
