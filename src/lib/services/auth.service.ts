import type { AuthSessionDto, UserProfileDto } from "@/types";
import { AppError } from "@/lib/error-handler";
import { repositories } from "@/lib/repositories";

/**
 * Service for authentication-related operations
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AuthService {
  /**
   * Retrieves current authenticated user session with profile data
   *
   * @returns Promise<AuthSessionDto> - User session data including auth user and profile
   * @throws AuthError with code 'UNAUTHENTICATED' if user is not authenticated
   * @throws AuthError with code 'PROFILE_NOT_FOUND' if user profile doesn't exist
   */
  static async getCurrentSession(): Promise<AuthSessionDto> {
    const supabase = repositories.getSupabaseClient();

    // Step 1: Get authenticated user from SSR-aware Supabase client
    // The client automatically handles cookie-based session management
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      throw new AppError("UNAUTHENTICATED");
    }

    // Step 2: Fetch user profile from database
    // RLS policy ensures user can only access their own profile
    let profile = await repositories.userProfiles.findById(user.id);

    if (!profile) {
      // If profile doesn't exist, create it manually
      profile = await repositories.userProfiles.create({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      });
    }

    // Step 3: Build and return DTO
    // Treat empty strings as null for avatar URLs
    const avatarUrl = profile.avatar_url && profile.avatar_url.trim() !== "" ? profile.avatar_url : null;

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      profile: {
        id: profile.id,
        username: profile.username,
        avatar_url: avatarUrl,
        created_at: profile.created_at,
      },
    };
  }

  /**
   * Checks if a username is available for registration or profile updates
   *
   * @param username - Username to check for availability (case-insensitive)
   * @returns Promise<{ available: boolean }> - True if username is available, false if taken
   * @throws Error if database query fails
   */
  static async checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
    // Step 1: Query user_profiles table for case-insensitive username match
    const available = await repositories.userProfiles.isUsernameAvailable(username);

    // Step 2: Return availability status
    return {
      available,
    };
  }

  /**
   * Claims a username for the authenticated user
   *
   * This operation is one-time only - once a username is set, it cannot be changed.
   * The method performs comprehensive validation and ensures username uniqueness.
   *
   * @param username - Username to claim (must match ^[a-z0-9-]{3,30}$ pattern)
   * @returns Promise<UserProfileDto> - Updated user profile with the claimed username
   * @throws AuthError with code 'UNAUTHENTICATED' if user is not authenticated
   * @throws AuthError with code 'PROFILE_NOT_FOUND' if user profile doesn't exist
   * @throws AuthError with code 'INVALID_USERNAME_FORMAT' if username doesn't match pattern
   * @throws AuthError with code 'USERNAME_ALREADY_SET' if user already has a username
   * @throws AuthError with code 'USERNAME_TAKEN' if username is already taken by another user
   * @throws Error for database operation failures
   */
  static async claimUsername(username: string): Promise<UserProfileDto> {
    const supabase = repositories.getSupabaseClient();

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

    const profile = await repositories.userProfiles.findById(user.id);

    if (!profile) {
      throw new AppError("PROFILE_NOT_FOUND", undefined, { userId: user.id });
    }

    // Step 3: Check if user already has a username set
    if (profile.username) {
      throw new AppError("USERNAME_ALREADY_SET", undefined, { userId: user.id });
    }

    // Step 4: Claim the username using the repository method
    const updatedProfile = await repositories.userProfiles.claimUsername(user.id, username);

    // Step 5: Return updated profile data
    return {
      id: updatedProfile.id,
      username: updatedProfile.username,
    };
  }
}
