import type { APIRoute } from "astro";
import type { ApiSuccessResponse, ComponentDto, AuthSessionDto } from "@/types";
import { ComponentService } from "@/lib/services/component.service";
import { AuthService } from "@/lib/services/auth.service";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import { componentIdSchema, reorderCommandSchema } from "@/lib/schemas/component.schemas";

// Disable prerendering for this API route
export const prerender = false;

/**
 * POST /api/v1/components/[id]/reorder
 *
 * Updates the position of a component within its section. This endpoint requires user authentication
 * and ensures users can only reorder components they own through Row Level Security policies.
 * The endpoint validates the component ID format and position, then shifts other components in the
 * same section to maintain proper ordering.
 *
 * @param request.body - Reorder command with new position (integer >= 0)
 * @returns 200 - Updated component data with new position
 * @returns 400 - Invalid component ID format or position
 * @returns 401 - User not authenticated
 * @returns 404 - Component not found or access denied
 * @returns 422 - Validation errors in request body
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async (context) => {
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

    // Step 4: Reorder component via service
    const updatedComponent = await ComponentService.reorderComponent(
      supabase,
      componentId,
      authenticatedUser.user.id,
      command
    );

    // Step 5: Return success response
    const response: ApiSuccessResponse<ComponentDto> = {
      data: updatedComponent,
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
      endpoint: `POST /api/v1/components/${componentId}/reorder`,
      route: request.url,
      userId: authenticatedUser?.user?.id,
    });
  }
};
