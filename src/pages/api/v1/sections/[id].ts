import type { APIRoute } from "astro";
import type { ApiSuccessResponse, SectionDto, UpdateSectionCommand, AuthSessionDto } from "@/types";
import { z } from "zod";
import { SectionService } from "@/lib/services/section.service";
import { AuthService } from "@/lib/services/auth.service";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import { sectionIdSchema } from "@/lib/schemas/section.schemas";

// Disable prerendering for this API route
export const prerender = false;

/**
 * Zod schema for section update validation
 */
const updateSectionSchema = z.object({
  name: z.string().max(150).trim().optional(),
  visible: z.boolean().optional(),
});

/**
 * PATCH /api/v1/sections/[id]
 *
 * Updates the name and/or visibility of an existing section. This endpoint requires user authentication
 * and ensures that only the section owner can make updates through Row Level Security (RLS) policies.
 * The endpoint validates input data and returns the updated section object upon successful update.
 *
 * @param request.body - Section update data (name and/or visible, both optional)
 * @returns 200 - Updated section data
 * @returns 401 - User not authenticated
 * @returns 403 - User does not own the section (enforced by RLS)
 * @returns 404 - Section not found
 * @returns 422 - Validation errors
 * @returns 500 - Internal server error
 */
export const PATCH: APIRoute = async (context) => {
  const { locals, request, params } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();
  const sectionId = params.id;
  let authenticatedUser: AuthSessionDto | null = null;

  try {
    // Step 1: Authentication check
    authenticatedUser = await AuthService.getCurrentSession(supabase);

    // Step 2: Validate section ID parameter
    if (!sectionId || typeof sectionId !== "string") {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Invalid section ID");
    }

    // Step 3: Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Invalid JSON in request body");
    }

    const validationResult = updateSectionSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Invalid input data", validationResult.error.format());
    }

    const command: UpdateSectionCommand = validationResult.data;

    // Step 4: Update section via service
    const updatedSection = await SectionService.updateSection(supabase, sectionId, authenticatedUser.user.id, command);

    // Step 5: Return success response
    const response: ApiSuccessResponse<SectionDto> = {
      data: updatedSection,
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
      endpoint: `PATCH /api/v1/sections/${sectionId}`,
      route: request.url,
      userId: authenticatedUser?.user?.id,
    });
  }
};

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
      route: request.url,
      userId: authenticatedUser?.user?.id,
    });
  }
};
