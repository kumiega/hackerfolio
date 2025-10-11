import type { APIRoute } from "astro";
import type { AuthSessionDto } from "@/types";
import { ComponentService } from "@/lib/services/component.service";
import { AuthService } from "@/lib/services/auth.service";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import { componentIdSchema } from "@/lib/schemas/component.schemas";

// Disable prerendering for this API route
export const prerender = false;

/**
 * DELETE /api/v1/components/[id]
 *
 * Removes a component from a portfolio section. This endpoint requires user authentication
 * and ensures that only the component owner can perform the deletion through Row Level Security (RLS) policies.
 * The endpoint validates the component ID format and delegates the deletion logic to the ComponentService,
 * which also handles reordering of remaining components in the section to maintain proper positioning.
 *
 * @param params.id - Component UUID (required path parameter)
 * @returns 204 - No Content (successful deletion)
 * @returns 400 - Invalid component ID format
 * @returns 401 - User not authenticated
 * @returns 404 - Component not found or access denied
 * @returns 500 - Internal server error
 */
export const DELETE: APIRoute = async (context) => {
  const { locals, request, params } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();
  const componentId = params.id;
  let authenticatedUser: AuthSessionDto | null = null;

  try {
    // Step 1: Authentication check
    authenticatedUser = await AuthService.getCurrentSession(supabase);

    // Step 2: Validate component ID parameter
    if (!componentId || typeof componentId !== "string") {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Component ID is required");
    }

    const componentIdValidation = componentIdSchema.safeParse(componentId);
    if (!componentIdValidation.success) {
      return createErrorResponse("INVALID_COMPONENT_ID", requestId, "Invalid component ID format");
    }

    // Step 3: Execute deletion logic
    await ComponentService.deleteComponent(supabase, componentId, authenticatedUser.user.id);

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
      endpoint: `DELETE /api/v1/components/${componentId}`,
      route: request.url,
      userId: authenticatedUser?.user?.id,
    });
  }
};
