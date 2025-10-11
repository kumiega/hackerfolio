import type { SupabaseClient } from "@/db/supabase.client";
import type { AuthSessionDto } from "@/types";

/**
 * Custom error class for authentication errors
 */
class AuthError extends Error {
  userId?: string;

  constructor(code: string, userId?: string) {
    super(code);
    this.name = code;
    this.userId = userId;
  }
}

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
      throw new AuthError("UNAUTHENTICATED");
    }

    // Step 2: Fetch user profile from database
    // RLS policy ensures user can only access their own profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, username, created_at")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      throw new AuthError("PROFILE_NOT_FOUND", user.id);
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
}
