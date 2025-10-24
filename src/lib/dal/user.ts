/**
 * User profile related data access functions
 */

import { repositories } from "@/lib/repositories";
import { AppError } from "@/lib/error-handler";
import type { UserProfileDisplay } from "./types";

/**
 * Check if user has a username (for onboarding flow)
 *
 * @param userId - User ID to check
 * @returns Promise<boolean> - True if user has username, false otherwise
 */
export async function hasUsername(userId: string): Promise<boolean> {
  try {
    const profile = await repositories.userProfiles.findById(userId);
    return Boolean(profile?.username);
  } catch (error) {
    // If profile doesn't exist, user doesn't have username
    if (error instanceof AppError && error.code === "DATABASE_ERROR") {
      return false;
    }
    throw error;
  }
}

/**
 * Get user profile for display purposes
 *
 * @param userId - User ID
 * @returns Promise<UserProfileDisplay | null> - Profile data or null if not found
 */
export async function getProfileForDisplay(userId: string): Promise<UserProfileDisplay | null> {
  try {
    const profile = await repositories.userProfiles.findById(userId);
    if (!profile) return null;

    return {
      id: profile.id,
      username: profile.username,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
    };
  } catch (error) {
    if (error instanceof AppError && error.code === "DATABASE_ERROR") {
      return null;
    }
    throw error;
  }
}

/**
 * Check if username is available
 *
 * @param username - Username to check
 * @returns Promise<boolean> - True if available, false if taken
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  try {
    const existingProfile = await repositories.userProfiles.findByUsername(username);
    return !existingProfile;
  } catch (error) {
    if (error instanceof AppError && error.code === "DATABASE_ERROR") {
      return true; // If error checking, assume available
    }
    throw error;
  }
}

/**
 * Get all user profiles for debugging/admin purposes
 *
 * @returns Promise<UserProfileDisplay[]> - Array of user profiles
 */
export async function getAllProfiles(): Promise<UserProfileDisplay[]> {
  try {
    const profiles = await repositories.userProfiles.findAll();
    return profiles.map((profile) => ({
      id: profile.id,
      username: profile.username,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
    }));
  } catch (error) {
    if (error instanceof AppError && error.code === "DATABASE_ERROR") {
      return [];
    }
    throw error;
  }
}
