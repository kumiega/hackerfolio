# API Endpoint Implementation Plan: GET /api/v1/sections/:sectionId/components

## 1. Endpoint Overview
This endpoint retrieves a paginated list of components within a specific section, ordered by position by default. It supports advanced filtering by component type, full-text search within component data, and customizable sorting. The endpoint requires user authentication and ensures data isolation through Row Level Security policies.

## 2. Request Details
- **HTTP Method**: GET
- **URL Structure**: `/api/v1/sections/:sectionId/components`
- **Authentication**: Required (Supabase session)
- **Parameters**:
  - **Required**:
    - `sectionId` (path parameter, UUID format) - ID of the section to list components from
  - **Optional**:
    - `page` (query parameter, number, default: 1, min: 1) - Page number for pagination
    - `per_page` (query parameter, number, default: 20, min: 1, max: 100) - Number of items per page
    - `sort` (query parameter, string, default: "position", enum: ["position", "created_at"]) - Field to sort by
    - `order` (query parameter, string, default: "asc", enum: ["asc", "desc"]) - Sort direction
    - `type` (query parameter, ComponentType enum, optional) - Filter components by type
    - `q` (query parameter, string, optional) - Search query within component data JSONB field

## 3. Used Types
**Request Types:**
- `ComponentListQuery` (extends PaginationQuery, SortingQuery with type?: ComponentType, q?: string)

**Response Types:**
- `ApiSuccessResponse<ComponentDto[]>` with pagination metadata (page, per_page, total, total_pages)
- `ComponentDto` (id, type, position, data)

**Schema Types:**
- `ComponentListQuerySchema` (new Zod schema for query validation)
- `SectionId` (existing UUID validation)

## 4. Response Details
- **Success Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "text|project_card|tech_list|...",
      "position": 0,
      "data": {
        // type-specific data structure
      }
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

- **Error Responses**:
  - `400` - Invalid sectionId format or query parameters
  - `401` - User not authenticated
  - `404` - Section not found or access denied
  - `500` - Internal server error

## 5. Data Flow
1. **Authentication**: Verify user session via `AuthService.getCurrentSession()`
2. **Parameter Validation**:
   - Validate `sectionId` as UUID format
   - Parse and validate query parameters using `componentListQuerySchema`
3. **Authorization**: RLS policies ensure user can only access components from owned sections
4. **Data Retrieval**: Call `ComponentService.listComponents()` with validated parameters
5. **Response Building**: Format results with pagination metadata
6. **Error Handling**: Catch and handle errors with appropriate status codes and logging

## 6. Security Considerations
- **Authentication Required**: All requests must include valid Supabase session
- **Authorization**: Row Level Security ensures users can only access components from sections they own through the portfolio ownership chain
- **Input Validation**: All parameters validated with Zod schemas to prevent injection attacks
- **Data Isolation**: RLS policies prevent unauthorized data access
- **Rate Limiting**: Consider implementing rate limiting for high-frequency requests
- **Audit Trail**: All operations logged with user context for security monitoring

## 7. Error Handling
**Potential Error Scenarios:**
- **Invalid Parameters (400)**: Malformed UUID, invalid pagination values, unknown sort fields
- **Authentication Failure (401)**: Missing or invalid session
- **Resource Not Found (404)**: Section doesn't exist or user lacks ownership
- **Database Errors (500)**: Connection issues, query failures, constraint violations

**Error Logging:**
- All errors logged to `app_errors` table with context (userId, sectionId, requestId)
- Include request parameters and stack traces for debugging
- Use structured error codes for consistent error handling

## 8. Performance Considerations
- **Database Optimization**:
  - Leverage existing B-tree indexes on `(section_id, position)`
  - Utilize GIN index on `data` field for JSONB search queries
  - RLS policies automatically filter results at database level
- **Query Efficiency**: Single optimized query with filtering, sorting, and pagination
- **Response Size**: Pagination prevents large result sets (max 100 items per page)
- **Caching Strategy**: Consider API response caching for frequently accessed sections
- **Monitoring**: Track query performance and implement alerts for slow queries

## 9. Implementation Steps
1. **Create Validation Schema**
   - Add `componentListQuerySchema` to `src/lib/schemas/component.schemas.ts`
   - Define validation rules for all query parameters
   - Export inferred TypeScript type

2. **Implement Service Method**
   - Add `listComponents()` method to `ComponentService` class
   - Implement filtering logic (type, search query)
   - Add sorting and pagination support
   - Return paginated results with total count
   - Include proper error handling with AppError

3. **Create API Endpoint**
   - Create `src/pages/api/v1/sections/[sectionId]/components/index.ts`
   - Implement GET handler with authentication and validation
   - Parse query parameters and call service method
   - Return formatted response with pagination metadata
   - Implement comprehensive error handling

4. **Add Error Constants**
   - Review and add any missing error codes to `error-constants.ts`
   - Ensure consistent error code usage across implementation
