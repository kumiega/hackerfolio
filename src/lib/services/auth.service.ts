import type { SupabaseClient } from "@/db/supabase.client";
import type { AuthSessionDto, UserProfileDto } from "@/types";
import { AppError } from "@/lib/error-handler";

/**
 * Service for authentication-related operations
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AuthService {
  /**
   * Retrieves current authenticated user session with profile data
   *
   * @param supabase - Supabase client instance from context.locals
   * @returns Promise<AuthSessionDto> - User session data including auth user and profile
   * @throws AuthError with code 'UNAUTHENTICATED' if user is not authenticated
   * @throws AuthError with code 'PROFILE_NOT_FOUND' if user profile doesn't exist
   */
  static async getCurrentSession(supabase: SupabaseClient): Promise<AuthSessionDto> {
    // Step 1: Get authenticated user
    // Use getUser() instead of getSession() to verify JWT signature
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      throw new AppError("UNAUTHENTICATED");
    }

    // Step 2: Fetch user profile from database
    // RLS policy ensures user can only access their own profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, username, created_at")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      throw new AppError("PROFILE_NOT_FOUND", undefined, { userId: user.id });
    }

    // Step 3: Build and return DTO
    return {
      user: {
        id: user.id,
        email: user.email,
      },
      profile: {
        id: profile.id,
        username: profile.username,
        created_at: profile.created_at,
      },
    };
  }

  /**
   * Checks if a username is available for registration or profile updates
   *
   * @param supabase - Supabase client instance from context.locals
   * @param username - Username to check for availability (case-insensitive)
   * @returns Promise<{ available: boolean }> - True if username is available, false if taken
   * @throws Error if database query fails
   */
  static async checkUsernameAvailability(supabase: SupabaseClient, username: string): Promise<{ available: boolean }> {
    // Step 1: Query user_profiles table for case-insensitive username match
    const { data, error } = await supabase
      .from("user_profiles")
      .select("username")
      .ilike("username", username) // Case-insensitive search
      .limit(1);

    // Handle database errors
    if (error) {
      throw new Error(`Database error while checking username availability: ${error.message}`);
    }

    // Step 2: Return availability status
    // Username is available if no matching records found
    return {
      available: !data || data.length === 0,
    };
  }

  /**
   * Claims a username for the authenticated user
   *
   * This operation is one-time only - once a username is set, it cannot be changed.
   * The method performs comprehensive validation and ensures username uniqueness.
   *
   * @param supabase - Supabase client instance from context.locals
   * @param username - Username to claim (must match ^[a-z0-9-]{3,30}$ pattern)
   * @returns Promise<UserProfileDto> - Updated user profile with the claimed username
   * @throws AuthError with code 'UNAUTHENTICATED' if user is not authenticated
   * @throws AuthError with code 'PROFILE_NOT_FOUND' if user profile doesn't exist
   * @throws AuthError with code 'INVALID_USERNAME_FORMAT' if username doesn't match pattern
   * @throws AuthError with code 'USERNAME_ALREADY_SET' if user already has a username
   * @throws AuthError with code 'USERNAME_TAKEN' if username is already taken by another user
   * @throws Error for database operation failures
   */
  static async claimUsername(supabase: SupabaseClient, username: string): Promise<UserProfileDto> {
    // Step 1: Validate username format
    const USERNAME_REGEX = /^[a-z0-9-]{3,30}$/;
    if (!USERNAME_REGEX.test(username)) {
      throw new AppError("INVALID_USERNAME_FORMAT");
    }

    // Step 2: Get authenticated user and their current profile
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      throw new AppError("UNAUTHENTICATED");
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, username, created_at")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      throw new AppError("PROFILE_NOT_FOUND", undefined, { userId: user.id });
    }

    // Step 3: Check if user already has a username set
    if (profile.username) {
      throw new AppError("USERNAME_ALREADY_SET", undefined, { userId: user.id });
    }

    // Step 4: Check username availability (case-insensitive)
    const { data: existingUsernames, error: availabilityError } = await supabase
      .from("user_profiles")
      .select("username")
      .ilike("username", username)
      .limit(1);

    if (availabilityError) {
      throw new Error(`Database error while checking username availability: ${availabilityError.message}`);
    }

    if (existingUsernames && existingUsernames.length > 0) {
      throw new AppError("USERNAME_TAKEN");
    }

    // Step 5: Update user profile with new username
    const { data: updatedProfile, error: updateError } = await supabase
      .from("user_profiles")
      .update({ username })
      .eq("id", user.id)
      .select("id, username")
      .single();

    if (updateError || !updatedProfile) {
      throw new Error(`Failed to update user profile with username: ${updateError?.message || "Unknown error"}`);
    }

    // Step 6: Return updated profile data
    return updatedProfile;
  }
}
