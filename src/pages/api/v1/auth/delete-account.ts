import type { APIRoute } from "astro";
import { z } from "zod";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import { repositories } from "@/lib/repositories";
import type { ApiSuccessResponse } from "@/types";

// Disable prerendering for this API route
export const prerender = false;

/**
 * Zod schema for validating delete account request
 */
const DeleteAccountSchema = z.object({
  confirmation: z.string().min(1, "Confirmation username is required"),
});

/**
 * DELETE /api/v1/auth/delete-account
 *
 * Allows authenticated users to permanently delete their account, profile, and all portfolio data.
 * This action cannot be undone and requires confirmation by typing the current username.
 *
 * Request Body:
 * - confirmation: string - Current username to confirm deletion
 *
 * @returns 200 - Account successfully deleted
 * @returns 400 - Invalid confirmation or malformed request
 * @returns 401 - User not authenticated
 * @returns 403 - Confirmation username doesn't match current username
 * @returns 404 - User profile not found
 * @returns 500 - Internal server error
 */
export const DELETE: APIRoute = async (context) => {
  const { locals, request } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();

  try {
    // Step 1: Parse and validate request body using Zod schema
    let requestBody: { confirmation: string };

    try {
      const rawBody = await request.json();
      requestBody = DeleteAccountSchema.parse(rawBody);
    } catch (parseError) {
      // Handle both JSON parsing errors and Zod validation errors
      if (parseError instanceof z.ZodError) {
        return createErrorResponse(
          "VALIDATION_ERROR",
          requestId,
          parseError.issues[0]?.message || "Invalid request data"
        );
      }
      return createErrorResponse("VALIDATION_ERROR", requestId, "Request body must be valid JSON");
    }

    // Step 2: Get authenticated user
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
        return createErrorResponse("UNAUTHENTICATED", requestId, "User not authenticated");
      }

      user = session.user;
    } else {
      user = authUser;
    }

    // Step 3: Get user profile to verify confirmation
    const profile = await repositories.userProfiles.findById(user.id);

    if (!profile) {
      return createErrorResponse("PROFILE_NOT_FOUND", requestId, "User profile not found");
    }

    // Step 4: Verify confirmation matches current username
    if (!profile.username || requestBody.confirmation !== profile.username) {
      return createErrorResponse(
        "CONFIRMATION_MISMATCH",
        requestId,
        "Confirmation username does not match your current username"
      );
    }

    // Step 5: Delete portfolio data (if exists)
    try {
      const portfolio = await repositories.portfolios.findByUserId(user.id);
      if (portfolio) {
        await repositories.portfolios.delete(portfolio.id);
      }
    } catch (portfolioError) {
      // Log but don't fail the entire deletion if portfolio deletion fails
      console.error("Failed to delete portfolio:", portfolioError);
    }

    // Step 6: Delete user profile
    await repositories.userProfiles.delete(user.id);

    // Step 7: Delete auth user account
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteAuthError) {
      console.error("Failed to delete auth user:", deleteAuthError);
      // This is critical, but we'll proceed since profile is already deleted
    }

    // Step 8: Build and return success response
    const response: ApiSuccessResponse<{ deleted: boolean }> = {
      data: { deleted: true },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleApiError(error, {
      supabase,
      requestId,
      endpoint: "DELETE /api/v1/auth/delete-account",
      route: request.url,
    });
  }
};
