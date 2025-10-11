# API Endpoint Implementation Plan: PATCH /api/v1/components/:id

## 1. Endpoint Overview
This endpoint allows authenticated users to update the data of an existing component in their portfolio. The endpoint supports updating any component type (text, project_card, tech_list, social_links, list, gallery, bio) while maintaining data integrity and ownership verification through Row Level Security (RLS) policies.

The endpoint delegates business logic to the existing `ComponentService.updateComponent()` method, which handles database operations and ownership verification.

## 2. Request Details
- **HTTP Method**: PATCH
- **URL Structure**: `/api/v1/components/:id`
  - `id`: Component UUID (required path parameter, validated as UUID format)
- **Parameters**:
  - **Required**: `id` (URL parameter) - Valid UUID string
- **Request Body**:
  ```json
  {
    "data": {
      // Type-specific component data structure
      // Varies based on component type (text, project_card, etc.)
    }
  }
  ```
- **Authentication**: Required (Bearer token in Authorization header)
- **Content-Type**: `application/json`

## 3. Used Types
- **Input Validation Schema**: `updateComponentCommandSchema` (from component.schemas.ts)
- **Request Model**: `UpdateComponentCommand` (from types.ts)
- **Response Model**: `ComponentDto` (from types.ts)
- **Authentication**: `AuthSessionDto` (from types.ts)

## 4. Response Details
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "uuid",
      "type": "component_type",
      "position": 0,
      "data": {
        // Updated component-specific data
      }
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Invalid component ID format or malformed request body
  - `401 Unauthorized`: Missing or invalid authentication
  - `404 Not Found`: Component doesn't exist or user doesn't own it
  - `422 Unprocessable Entity`: Component data validation failed
  - `500 Internal Server Error`: Database or server errors

## 5. Data Flow
1. **Authentication**: Extract and validate Bearer token, get user session
2. **Parameter Validation**: Validate component ID format (UUID)
3. **Request Body Validation**: Parse and validate request body structure
4. **Ownership Check**: Query component existence and ownership (handled by RLS)
5. **Type Validation**: Retrieve component type and validate data against type-specific schema
6. **Database Update**: Update component data in database
7. **Response**: Return updated component data

## 6. Security Considerations
- **Authentication Required**: All requests must include valid Bearer token
- **Authorization via RLS**: Database policies ensure users can only update their own components
- **Input Validation**: Strict schema validation prevents malformed data injection
- **SQL Injection Protection**: Parameterized queries and RLS policies
- **Data Sanitization**: JSONB storage with schema validation prevents malicious data
- **Rate Limiting**: Should be implemented at infrastructure level (nginx/edge)
- **Audit Logging**: All operations logged to `app_errors` table with context

## 7. Error Handling
- **Component ID Validation**: Invalid UUID format → 400 Bad Request
- **Authentication Failure**: Missing/invalid token → 401 Unauthorized
- **Component Not Found**: Component doesn't exist or ownership denied → 404 Not Found
- **Data Validation Failure**: Invalid component data structure → 422 Unprocessable Entity
- **Database Errors**: Connection/query failures → 500 Internal Server Error
- **Unexpected Errors**: Any unhandled exceptions → 500 Internal Server Error

All errors are logged to the `app_errors` table with full context including user ID, component ID, request details, and stack traces.

## 8. Performance Considerations
- **Database Queries**: Single UPDATE query with SELECT for component retrieval
- **RLS Overhead**: Row Level Security adds ownership verification to queries
- **JSONB Operations**: Efficient storage and retrieval of component data
- **Connection Pooling**: Supabase handles connection management
- **Caching Strategy**: No caching needed (user-specific data)
- **Response Size**: Component data is typically small (< 2KB)

## 9. Implementation Steps

### Step 1: Add PATCH Handler to Existing Endpoint File
Update `/src/pages/api/v1/components/[id]/index.ts` to include the PATCH method:

```typescript
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
  // Implementation details...
};
```

### Step 2: Implement Request Validation
Add comprehensive input validation using existing schemas:

```typescript
// Validate component ID
const componentIdValidation = componentIdSchema.safeParse(componentId);
if (!componentIdValidation.success) {
  return createErrorResponse("INVALID_COMPONENT_ID", requestId, "Invalid component ID format");
}

// Parse and validate request body
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
```

### Step 3: Add Type-Specific Data Validation
Enhance the update logic to validate component data against the correct type schema:

```typescript
// Get component type for validation
const { data: componentTypeData, error: typeError } = await supabase
  .from("components")
  .select("type")
  .eq("id", componentId)
  .single();

if (typeError) {
  // Handle component not found or ownership issues
}

// Validate data against type-specific schema
const typeSpecificValidation = getTypeSpecificSchema(componentTypeData.type).safeParse(commandValidation.data.data);
if (!typeSpecificValidation.success) {
  return createErrorResponse("VALIDATION_ERROR", requestId, "Component data does not match expected structure");
}
```

### Step 4: Execute Update Operation
Use the existing ComponentService.updateComponent method:

```typescript
const updatedComponent = await ComponentService.updateComponent(
  supabase,
  componentId,
  authenticatedUser.user.id,
  commandValidation.data
);
```

### Step 5: Return Success Response
Format and return the updated component data:

```typescript
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
```

### Step 6: Add Comprehensive Error Handling
Wrap all operations in try-catch with proper error logging:

```typescript
} catch (error) {
  return handleApiError(error, {
    supabase,
    requestId,
    endpoint: `PATCH /api/v1/components/${componentId}`,
    route: request.url,
    userId: authenticatedUser?.user?.id,
  });
}
```

### Step 7: Create Helper Function for Type Validation
Add a utility function to get the appropriate schema based on component type:

```typescript
function getTypeSpecificSchema(componentType: ComponentType) {
  switch (componentType) {
    case "text": return textComponentDataSchema;
    case "project_card": return projectCardComponentDataSchema;
    case "tech_list": return techListComponentDataSchema;
    case "social_links": return socialLinksComponentDataSchema;
    case "list": return linkListComponentDataSchema;
    case "gallery": return galleryComponentDataSchema;
    case "bio": return bioComponentDataSchema;
    default: throw new Error(`Unknown component type: ${componentType}`);
  }
}
```

### Step 8: Update Component Schemas
Enhance the `updateComponentCommandSchema` to include proper type-specific validation or implement runtime validation in the endpoint.

### Step 9: Testing
- **Unit Tests**: Test validation logic and error scenarios
- **Integration Tests**: Test full request/response cycle with database
- **Security Tests**: Verify RLS policies prevent unauthorized access
- **Performance Tests**: Verify response times under load

### Step 10: Documentation Updates
Update API documentation and OpenAPI specifications to include the new endpoint.
