# API Endpoint Implementation Plan: DELETE `/api/v1/sections/:id`

## 1. Endpoint Overview
This endpoint allows authenticated users to delete a section from their portfolio. The operation includes a critical business rule: users cannot delete the last section of an unpublished portfolio, as portfolios require at least one section to be publishable. The endpoint returns a 204 No Content response on successful deletion.

## 2. Request Details
- **HTTP Method**: DELETE
- **URL Structure**: `/api/v1/sections/:id`
- **Parameters**:
  - Required: `id` (string, UUID format) - The unique identifier of the section to delete
  - Optional: None
- **Request Body**: None (DELETE method)
- **Authentication**: Required (user must be authenticated)
- **Authorization**: User must own the section (enforced via Row Level Security)

## 3. Used Types
- **Request Validation Schema**: `sectionIdSchema` (existing)
- **Response**: 204 No Content (no response body)
- **Internal Types Used**:
  - `AuthSessionDto` - for authenticated user information
  - `SectionDto` - for internal section data operations
  - `PortfolioDto` - for portfolio publish status checking

## 4. Response Details
- **Success Response**: 204 No Content
  - Body: Empty
  - Headers: Standard response headers only
- **Error Responses**:
  - 400 Bad Request: Invalid section ID format
  - 401 Unauthorized: User not authenticated
  - 404 Not Found: Section not found or user doesn't own it
  - 409 Conflict: Cannot delete last required section (unpublished portfolio)
  - 500 Internal Server Error: Database or server errors

## 5. Data Flow
1. **Authentication**: Verify user session via `AuthService.getCurrentSession()`
2. **Parameter Validation**: Validate section ID format using Zod schema
3. **Ownership & Existence Check**: Query section to verify ownership (RLS enforced)
4. **Business Rule Validation**:
   - Get portfolio publish status
   - If portfolio is unpublished, count current sections
   - Prevent deletion if it would leave zero sections
5. **Deletion Operation**: Delete section and reorder remaining sections
6. **Response**: Return 204 No Content

## 6. Security Considerations
- **Authentication Required**: All requests must include valid authentication
- **Authorization via RLS**: Database-level Row Level Security ensures users can only access their own sections
- **Input Validation**: Section ID validated as UUID format to prevent injection attacks
- **Business Logic Protection**: Publish constraint prevents users from breaking portfolio requirements
- **Error Information Leakage**: Error messages avoid revealing sensitive information about other users' data

## 7. Error Handling
- **Validation Errors (400)**: Invalid section ID format
- **Authentication Errors (401)**: Missing or invalid authentication token
- **Not Found Errors (404)**: Section doesn't exist or belongs to another user
- **Business Rule Errors (409)**: Attempt to delete last section of unpublished portfolio
- **Database Errors (500)**: Connection issues, constraint violations, or unexpected database errors
- **Error Logging**: All errors logged to `app_errors` table with context (userId, sectionId, requestId, etc.)

## 8. Performance Considerations
- **Database Queries**: Minimal queries (1-3 depending on publish status)
- **Index Usage**: Leverages existing B-tree indexes on `sections(portfolio_id, position)`
- **Connection Pooling**: Uses Supabase connection pooling for efficient database access
- **Response Size**: 204 responses are minimal (no body content)
- **Caching**: No caching required for delete operations

## 9. Implementation Steps

### Step 1: Add Error Constant
Add new error code to `src/lib/error-constants.ts`:
```typescript
CANNOT_DELETE_LAST_REQUIRED: "CANNOT_DELETE_LAST_REQUIRED",
```

### Step 2: Enhance SectionService.deleteSection()
Modify `SectionService.deleteSection()` to include publish constraint validation:

```typescript
static async deleteSection(
  supabase: SupabaseClient,
  sectionId: string,
  userId: string
): Promise<void> {
  // Step 1: Get section details with portfolio information
  const { data: sectionToDelete, error: fetchError } = await supabase
    .from("sections")
    .select("portfolio_id, position")
    .eq("id", sectionId)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      throw new AppError(ERROR_CODES.SECTION_NOT_FOUND, undefined, { userId, details: { sectionId } });
    }
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      userId,
      details: { sectionId },
      cause: fetchError,
    });
  }

  // Step 2: Check portfolio publish status and section count for unpublished portfolios
  const { data: portfolio, error: portfolioError } = await supabase
    .from("portfolios")
    .select("is_published")
    .eq("id", sectionToDelete.portfolio_id)
    .eq("user_id", userId)
    .single();

  if (portfolioError) {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      userId,
      details: { sectionId, portfolioId: sectionToDelete.portfolio_id },
      cause: portfolioError,
    });
  }

  // Step 3: If portfolio is not published, ensure at least 1 section will remain
  if (!portfolio.is_published) {
    const { count: sectionCount, error: countError } = await supabase
      .from("sections")
      .select("*", { count: "exact", head: true })
      .eq("portfolio_id", sectionToDelete.portfolio_id);

    if (countError) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        details: { sectionId, portfolioId: sectionToDelete.portfolio_id },
        cause: countError,
      });
    }

    if ((sectionCount || 0) <= 1) {
      throw new AppError(ERROR_CODES.CANNOT_DELETE_LAST_REQUIRED, 
        "Cannot delete the last section of an unpublished portfolio", {
        userId,
        details: { sectionId, portfolioId: sectionToDelete.portfolio_id, sectionCount },
      });
    }
  }

  // Step 4: Delete the section
  const { error: deleteError } = await supabase
    .from("sections")
    .delete()
    .eq("id", sectionId);

  if (deleteError) {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      userId,
      details: { sectionId },
      cause: deleteError,
    });
  }

  // Step 5: Reorder remaining sections (existing logic)
  // ... existing reordering logic
}
```

### Step 3: Create API Endpoint
Create new file `src/pages/api/v1/sections/[id]/index.ts`:

```typescript
import type { APIRoute } from "astro";
import type { AuthSessionDto } from "@/types";
import { SectionService } from "@/lib/services/section.service";
import { AuthService } from "@/lib/services/auth.service";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import { sectionIdSchema } from "@/lib/schemas/section.schemas";

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
```

### Step 4: Update Error Handler (if needed)
Ensure error handler maps `CANNOT_DELETE_LAST_REQUIRED` to appropriate HTTP status (409).

### Step 5: Add Tests
Create comprehensive tests covering:
- Successful deletion scenarios
- Authentication failures
- Authorization failures (wrong user)
- Business rule violations (last section of unpublished portfolio)
- Invalid section ID formats
- Non-existent sections

### Step 6: Update API Documentation
Update OpenAPI/Swagger documentation to include the new DELETE endpoint with proper request/response examples and error codes.
