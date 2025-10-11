import type { APIRoute } from "astro";
import type { ApiSuccessResponse, ComponentDto, AuthSessionDto, CreateComponentCommand } from "@/types";
import { ComponentService } from "@/lib/services/component.service";
import { AuthService } from "@/lib/services/auth.service";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import {
  sectionIdSchema,
  componentListQuerySchema,
  createComponentCommandSchema,
} from "@/lib/schemas/component.schemas";

export const prerender = false;

/**
 * GET /api/v1/sections/[sectionId]/components
 *
 * Retrieves a paginated list of components within a specific section, ordered by position by default.
 * This endpoint supports advanced filtering by component type, full-text search within component data,
 * and customizable sorting. The endpoint requires user authentication and ensures data isolation
 * through Row Level Security policies.
 *
 * Query Parameters:
 * - page (number, default: 1, min: 1) - Page number for pagination
 * - per_page (number, default: 20, min: 1, max: 100) - Number of items per page
 * - sort (string, default: "position", enum: ["position", "created_at"]) - Field to sort by
 * - order (string, default: "asc", enum: ["asc", "desc"]) - Sort direction
 * - type (ComponentType enum, optional) - Filter components by type
 * - q (string, optional) - Search query within component data JSONB field
 *
 * @param params.id - Section ID (UUID format)
 * @returns 200 - Paginated list of components with pagination metadata
 * @returns 400 - Invalid section ID format or query parameters
 * @returns 401 - User not authenticated
 * @returns 404 - Section not found or access denied
 * @returns 500 - Internal server error
 */
export const GET: APIRoute = async (context) => {
  const { locals, request, params, url } = context;
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

    // Step 3: Parse and validate query parameters
    const queryParams = new URL(url).searchParams;
    const queryValidation = componentListQuerySchema.safeParse({
      page: queryParams.get("page"),
      per_page: queryParams.get("per_page"),
      sort: queryParams.get("sort"),
      order: queryParams.get("order"),
      type: queryParams.get("type"),
      q: queryParams.get("q"),
    });

    if (!queryValidation.success) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        requestId,
        "Invalid query parameters",
        queryValidation.error.format()
      );
    }

    const validatedQuery = queryValidation.data;

    // Step 4: Fetch components via service
    const { components, total } = await ComponentService.listComponents(
      supabase,
      sectionId,
      authenticatedUser.user.id,
      validatedQuery
    );

    // Step 5: Calculate pagination metadata
    const totalPages = Math.ceil(total / validatedQuery.per_page);

    // Step 6: Return success response with pagination metadata
    const response: ApiSuccessResponse<ComponentDto[]> = {
      data: components,
      meta: {
        page: validatedQuery.page,
        per_page: validatedQuery.per_page,
        total,
        total_pages: totalPages,
      },
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
      endpoint: `GET /api/v1/sections/${sectionId}/components`,
      route: request.url,
      userId: authenticatedUser?.user?.id,
    });
  }
};

/**
 * POST /api/v1/sections/[sectionId]/components
 *
 * Creates a new component within a specific section. This endpoint enforces a global portfolio-level
 * limit of 15 components total across all sections, ensuring portfolio size remains manageable.
 * The endpoint supports 8 different component types with type-specific data validation requirements.
 *
 * The component is automatically assigned the next available position within the section.
 * Ownership is enforced through Row Level Security policies ensuring users can only create
 * components in sections they own.
 *
 * Request Body:
 * - type (ComponentType): The type of component to create
 * - data (ComponentData): Type-specific component data matching the component type
 *
 * @param params.id - Section ID (UUID format)
 * @param request.body - Component creation data with type and data fields
 * @returns 201 - Created component data with assigned ID and position
 * @returns 400 - Invalid section ID format or request body
 * @returns 401 - User not authenticated
 * @returns 403 - User doesn't own the section (RLS violation)
 * @returns 404 - Section doesn't exist or access denied
 * @returns 409 - Portfolio component limit reached (15 total components)
 * @returns 422 - Invalid component type or data validation failed
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
    if (!authenticatedUser) {
      return createErrorResponse("UNAUTHORIZED", requestId, "Authentication required");
    }

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

    const bodyValidation = createComponentCommandSchema.safeParse(requestBody);
    if (!bodyValidation.success) {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Invalid request body", bodyValidation.error.format());
    }

    const validatedCommand: CreateComponentCommand = bodyValidation.data;

    // Step 4: Create component via service
    const createdComponent = await ComponentService.createComponent(
      supabase,
      sectionId,
      authenticatedUser.user.id,
      validatedCommand
    );

    // Step 5: Return success response with created component
    const response: ApiSuccessResponse<ComponentDto> = {
      data: createdComponent,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleApiError(error, {
      supabase,
      requestId,
      endpoint: `POST /api/v1/sections/${sectionId}/components`,
      route: request.url,
      userId: authenticatedUser?.user?.id,
    });
  }
};
