import type { UserProfileDto } from "@/types";
import { AppError } from "@/lib/error-handler";
import { repositories } from "@/lib/repositories";

/**
 * Service for authentication-related operations
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AuthService {
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
    let user;
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser || !authUser.email) {
      // If getUser() fails, try getSession() as fallback
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user || !session.user.email) {
        throw new AppError("UNAUTHENTICATED");
      }

      user = session.user;
    } else {
      user = authUser;
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
