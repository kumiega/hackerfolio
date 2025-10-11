import type { APIRoute } from "astro";
import type { AuthSessionDto, UpdateSectionCommand, SectionDto } from "@/types";
import { SectionService } from "@/lib/services/section.service";
import { AuthService } from "@/lib/services/auth.service";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import { sectionIdSchema, updateSectionCommandSchema } from "@/lib/schemas/section.schemas";

export const prerender = false;

/**
 * DELETE /api/v1/sections/[id]
 *
 * Deletes a section from the user's portfolio. This endpoint requires user authentication
 * and ensures that only the section owner can delete sections through Row Level Security.
 * Additionally, it prevents deletion of the last section in unpublished portfolios to maintain
 * minimum publishing requirements.
 *
 * @param params.id - Section ID to delete (UUID format)
 * @returns 204 - Section successfully deleted
 * @returns 400 - Invalid section ID format
 * @returns 401 - User not authenticated
 * @returns 404 - Section not found or access denied
 * @returns 409 - Cannot delete last required section
 * @returns 500 - Internal server error
 */
export const DELETE: APIRoute = async (context) => {
  const { locals, params } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();
  const sectionId = params.id;
  let authenticatedUser: AuthSessionDto | null = null;

  try {
    // Step 1: Authentication check
    authenticatedUser = await AuthService.getCurrentSession(supabase);

    // Step 2: Validate section ID parameter
    if (!sectionId || typeof sectionId !== "string") {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Section ID is required");
    }

    const sectionIdValidation = sectionIdSchema.safeParse(sectionId);
    if (!sectionIdValidation.success) {
      return createErrorResponse("INVALID_SECTION_ID", requestId, "Invalid section ID format");
    }

    // Step 3: Delete section via service (includes all business logic)
    await SectionService.deleteSection(supabase, sectionId, authenticatedUser.user.id);

    // Step 4: Return success response (204 No Content)
    return new Response(null, {
      status: 204,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleApiError(error, {
      supabase,
      requestId,
      endpoint: `DELETE /api/v1/sections/${sectionId}`,
      route: context.request.url,
      userId: authenticatedUser?.user?.id,
    });
  }
};

/**
 * PATCH /api/v1/sections/[id]
 *
 * Updates a section's name and/or visibility in the user's portfolio. This endpoint requires
 * user authentication and ensures that only the section owner can update sections through
 * Row Level Security policies. Changes are atomic and return the updated section data.
 *
 * @param params.id - Section ID to update (UUID format)
 * @param body - Partial section update data (name and/or visible)
 * @returns 200 - Section successfully updated with new data
 * @returns 400 - Invalid section ID format or malformed JSON
 * @returns 401 - User not authenticated
 * @returns 403 - User does not own the section (enforced by RLS)
 * @returns 404 - Section does not exist
 * @returns 422 - Validation errors (name too long, invalid data types)
 * @returns 500 - Internal server error
 */
export const PATCH: APIRoute = async (context) => {
  const { locals, params, request } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();
  const sectionId = params.id;
  let authenticatedUser: AuthSessionDto | null = null;

  try {
    // Step 1: Authentication check
    authenticatedUser = await AuthService.getCurrentSession(supabase);

    // Step 2: Validate section ID parameter
    if (!sectionId || typeof sectionId !== "string") {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Section ID is required");
    }

    const sectionIdValidation = sectionIdSchema.safeParse(sectionId);
    if (!sectionIdValidation.success) {
      return createErrorResponse("INVALID_SECTION_ID", requestId, "Invalid section ID format");
    }

    // Step 3: Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return createErrorResponse("INVALID_JSON", requestId, "Invalid JSON in request body");
    }

    const bodyValidation = updateSectionCommandSchema.safeParse(requestBody);
    if (!bodyValidation.success) {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Invalid request body", {
        details: bodyValidation.error.issues,
      });
    }

    const command: UpdateSectionCommand = bodyValidation.data;

    // Step 4: Update section via service (includes all business logic and ownership verification)
    const updatedSection: SectionDto = await SectionService.updateSection(
      supabase,
      sectionId,
      authenticatedUser.user.id,
      command
    );

    // Step 5: Return success response with updated section data
    return new Response(
      JSON.stringify({
        data: updatedSection,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": requestId,
        },
      }
    );
  } catch (error) {
    return handleApiError(error, {
      supabase,
      requestId,
      endpoint: `PATCH /api/v1/sections/${sectionId}`,
      route: context.request.url,
      userId: authenticatedUser?.user?.id,
    });
  }
};
