import type { APIRoute } from "astro";
import type { AuthSessionDto } from "@/types";
import { ComponentService } from "@/lib/services/component.service";
import { AuthService } from "@/lib/services/auth.service";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import { componentIdSchema, updateComponentCommandSchema } from "@/lib/schemas/component.schemas";
import {
  textComponentDataSchema,
  projectCardComponentDataSchema,
  techListComponentDataSchema,
  socialLinksComponentDataSchema,
  linkListComponentDataSchema,
  galleryComponentDataSchema,
  bioComponentDataSchema,
  orderedListComponentDataSchema,
} from "@/lib/schemas/component.schemas";
import { z } from "zod";
import type { ComponentType } from "@/types";

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

/**
 * PATCH /api/v1/components/[id]
 *
 * Updates component data for an existing component. This endpoint requires user authentication
 * and ensures that only the component owner can perform updates through Row Level Security (RLS) policies.
 * The endpoint validates the component ID format and request body, then delegates the update logic
 * to the ComponentService, which handles data validation and database operations.
 *
 * @param params.id - Component UUID (required path parameter)
 * @param body.data - Updated component data (type-specific structure)
 * @returns 200 - Updated component data
 * @returns 400 - Invalid component ID format or malformed request body
 * @returns 401 - User not authenticated
 * @returns 404 - Component not found or access denied
 * @returns 422 - Component data validation failed
 * @returns 500 - Internal server error
 */
export const PATCH: APIRoute = async (context) => {
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

    const commandValidation = updateComponentCommandSchema.safeParse(requestBody);
    if (!commandValidation.success) {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Invalid request body structure");
    }

    // Step 4: Get component type for validation
    const { data: componentTypeData, error: typeError } = await supabase
      .from("components")
      .select("type")
      .eq("id", componentId)
      .single();

    if (typeError) {
      // If no row found, component doesn't exist or user doesn't own it
      if (typeError.code === "PGRST116") {
        return createErrorResponse("COMPONENT_NOT_FOUND", requestId, "Component not found or access denied");
      }
      return createErrorResponse("DATABASE_ERROR", requestId, "Failed to retrieve component information");
    }

    // Step 5: Validate data against type-specific schema
    const typeSpecificValidation = getTypeSpecificSchema(componentTypeData.type).safeParse(commandValidation.data.data);
    if (!typeSpecificValidation.success) {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Component data does not match expected structure");
    }

    // Step 6: Execute update operation
    const updatedComponent = await ComponentService.updateComponent(
      supabase,
      componentId,
      authenticatedUser.user.id,
      commandValidation.data
    );

    // Step 7: Return success response
    return new Response(
      JSON.stringify({
        data: updatedComponent,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return handleApiError(error, {
      supabase,
      requestId,
      endpoint: `PATCH /api/v1/components/${componentId}`,
      route: request.url,
      userId: authenticatedUser?.user?.id,
    });
  }
};

/**
 * Helper function to get the appropriate Zod schema for validating component data
 * based on the component type.
 *
 * @param componentType - The type of the component
 * @returns Zod schema for the component data type
 * @throws Error if component type is unknown
 */
function getTypeSpecificSchema(componentType: ComponentType) {
  switch (componentType) {
    case "text":
      return textComponentDataSchema;
    case "project_card":
      return projectCardComponentDataSchema;
    case "tech_list":
      return techListComponentDataSchema;
    case "social_links":
      return socialLinksComponentDataSchema;
    case "list":
      return z.union([linkListComponentDataSchema, orderedListComponentDataSchema]);
    case "gallery":
      return galleryComponentDataSchema;
    case "bio":
      return bioComponentDataSchema;
    default:
      throw new Error(`Unknown component type: ${componentType}`);
  }
}
