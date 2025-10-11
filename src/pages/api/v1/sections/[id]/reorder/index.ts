import type { APIRoute } from "astro";
import type { ApiSuccessResponse, SectionDto, AuthSessionDto } from "@/types";
import { SectionService } from "@/lib/services/section.service";
import { AuthService } from "@/lib/services/auth.service";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import { sectionIdSchema, reorderCommandSchema } from "@/lib/schemas/section.schemas";

// Disable prerendering for this API route
export const prerender = false;

/**
 * POST /api/v1/sections/[id]/reorder
 *
 * Updates the position of a section within its portfolio. This endpoint requires user authentication
 * and ensures users can only reorder sections they own through Row Level Security policies.
 * The endpoint validates the section ID format and position, then shifts other sections in the
 * same portfolio to maintain proper ordering.
 *
 * @param request.body - Reorder command with new position (integer >= 0)
 * @returns 200 - Updated section data with new position
 * @returns 400 - Invalid section ID format or position out of bounds
 * @returns 401 - User not authenticated
 * @returns 404 - Section not found or access denied
 * @returns 422 - Validation errors in request body
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async (context) => {
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
      return createErrorResponse("VALIDATION_ERROR", requestId, "Invalid JSON in request body");
    }

    const validationResult = reorderCommandSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Invalid input data", validationResult.error.format());
    }

    const command = validationResult.data;

    // Step 4: Reorder section via service
    const updatedSection = await SectionService.reorderSection(supabase, sectionId, authenticatedUser.user.id, command);

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
      endpoint: `POST /api/v1/sections/${sectionId}/reorder`,
      route: request.url,
      userId: authenticatedUser?.user?.id,
    });
  }
};
