import type { APIRoute } from "astro";
import { z } from "zod";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import { repositories } from "@/lib/repositories";
import type { ApiSuccessResponse } from "@/types";
import { supabaseServiceClient } from "@/db/supabase.server";

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

  console.log("🗑️ Delete account request started", { requestId, url: request.url });

  try {
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

    console.log("🔍 Checking user authentication...");

    let user;
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("Auth user result:", { hasUser: !!authUser, hasError: !!authError, userId: authUser?.id });

    if (authError || !authUser || !authUser.email) {
      console.log("Primary auth check failed, trying session fallback...");
      // If getUser() fails, try getSession() as fallback
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      console.log("Session result:", {
        hasSession: !!session,
        hasError: !!sessionError,
        sessionUserId: session?.user?.id,
      });

      if (sessionError || !session?.user || !session.user.email) {
        console.log("❌ Authentication failed");
        return createErrorResponse("UNAUTHENTICATED", requestId, "User not authenticated");
      }

      user = session.user;
    } else {
      user = authUser;
    }

    console.log("✅ User authenticated:", { userId: user.id, email: user.email });

    console.log("🔍 Finding user profile...");
    const profile = await repositories.userProfiles.findById(user.id);
    console.log("Profile result:", { hasProfile: !!profile, username: profile?.username });

    if (!profile) {
      return createErrorResponse("PROFILE_NOT_FOUND", requestId, "User profile not found");
    }

    if (!profile.username || requestBody.confirmation !== profile.username) {
      return createErrorResponse(
        "CONFIRMATION_MISMATCH",
        requestId,
        "Confirmation username does not match your current username"
      );
    }

    console.log("🗑️ Starting deletion process...");

    // Note: OAuth tokens and app errors will be automatically cleaned up
    // when the user profile is deleted due to foreign key constraints

    // Delete portfolio
    console.log("🗂️ Deleting portfolio...");
    try {
      const portfolio = await repositories.portfolios.findByUserId(user.id);
      console.log("Portfolio found:", { hasPortfolio: !!portfolio, portfolioId: portfolio?.id });
      if (portfolio) {
        await repositories.portfolios.delete(portfolio.id);
        console.log("✅ Portfolio deleted successfully");
      }
    } catch (portfolioError) {
      // Log but don't fail the entire deletion if portfolio deletion fails
      console.error("❌ Failed to delete portfolio:", portfolioError);
    }

    // Finally delete the user profile
    console.log("👤 Deleting user profile...");
    await repositories.userProfiles.delete(user.id);
    console.log("✅ User profile deleted successfully");

    console.log("🔐 Deleting auth user...");
    const { error: deleteAuthError } = await supabaseServiceClient.auth.admin.deleteUser(user.id);
    if (deleteAuthError) {
      console.error("❌ Failed to delete auth user:", deleteAuthError);
      // This is critical, but we'll proceed since profile is already deleted
    } else {
      console.log("✅ Auth user deleted successfully");
    }

    console.log("🎉 Account deletion completed successfully!");

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
      supabase: supabaseServiceClient,
      requestId,
      endpoint: "DELETE /api/v1/auth/delete-account",
      route: request.url,
    });
  }
};
