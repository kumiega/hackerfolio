# API Endpoint Implementation Plan: POST /api/v1/sections/:id/reorder

## 1. Endpoint Overview
This endpoint allows authenticated users to reorder sections within their portfolio by updating the position of a specific section. The operation shifts other sections in the same portfolio to maintain proper ordering. The endpoint ensures data integrity and security through Row Level Security policies and comprehensive validation.

## 2. Request Details
- HTTP Method: POST
- URL Structure: `/api/v1/sections/:id/reorder`
- Parameters:
  - Required: `id` (URL parameter) - Section ID in UUID format
  - Optional: None
- Request Body:
```json
{
  "position": 1
}
```
- Authentication: Required (Supabase session)
- Content-Type: application/json

## 3. Used Types
- **Request Command Model**: `ReorderCommand` from `@/types`
  - `position: number` (integer >= 0)
- **Response DTO**: `SectionDto` from `@/types`
  - `id: string`
  - `name: string`
  - `position: number`
  - `visible: boolean`
- **Validation Schemas**:
  - `sectionIdSchema` - UUID validation for section ID
  - `reorderCommandSchema` - Position validation (integer >= 0)

## 4. Response Details
- **Success Response (200)**:
```json
{
  "data": {
    "id": "uuid",
    "name": "Section Name",
    "position": 1,
    "visible": true
  }
}
```
- **Error Responses**:
  - 400: Invalid section ID format or position value
  - 401: User not authenticated
  - 404: Section not found or user doesn't own it
  - 422: Validation errors in request body
  - 500: Internal server error (database errors)

## 5. Data Flow
1. **Authentication**: Verify user session via Supabase Auth
2. **Parameter Validation**: Validate section ID format (UUID)
3. **Body Validation**: Parse and validate JSON body with position field
4. **Authorization**: RLS policies ensure user owns the section's portfolio
5. **Position Validation**: Ensure new position is within valid range for the portfolio
6. **Database Operations**:
   - Fetch current section details (portfolio_id, current position)
   - Shift other sections' positions to make room for the move
   - Update target section's position
7. **Response**: Return updated section data

## 6. Security Considerations
- **Authentication**: Required Supabase session validation
- **Authorization**: Row Level Security policies prevent access to sections not owned by the user
- **Input Validation**: Comprehensive validation of section ID (UUID) and position (integer >= 0)
- **Position Bounds**: Validate that new position is within valid range (0 to section count - 1)
- **SQL Injection Protection**: All database queries use parameterized queries via Supabase client
- **Error Information Leakage**: Error responses don't expose sensitive system information

## 7. Error Handling
- **Validation Errors (400/422)**:
  - Invalid section ID format
  - Invalid JSON in request body
  - Position not an integer or negative
  - Missing required position field
- **Authentication Errors (401)**:
  - Missing or invalid Supabase session
- **Authorization Errors (404)**:
  - Section doesn't exist
  - User doesn't own the section (RLS enforced)
- **Database Errors (500)**:
  - Connection failures
  - Constraint violations
  - Unexpected database errors
- **Error Logging**: All errors logged to `app_errors` table with context including user ID, section ID, and operation details

## 8. Performance Considerations
- **Database Queries**: Minimal queries (1-3 SELECT, 1-3 UPDATE operations)
- **Index Usage**: Leverages existing B-tree indexes on `sections(portfolio_id, position)`
- **Transaction Safety**: Individual updates ensure consistency but may benefit from explicit transactions for complex reordering
- **Response Size**: Returns single section object (minimal payload)
- **Concurrent Access**: Position shifting logic handles concurrent updates gracefully

## 9. Implementation Steps
1. **Update SectionService.reorderSection method**:
   - Modify return type from `SectionDto[]` to `SectionDto`
   - Return only the reordered section instead of all sections
   - Add position bounds validation (0 to section count - 1)

2. **Create endpoint file**: `src/pages/api/v1/sections/[id]/reorder/index.ts`
   - Import required services, schemas, and error handlers
   - Implement POST handler following established patterns
   - Add comprehensive JSDoc documentation
   - Use `export const prerender = false`

3. **Implement request processing**:
   - Extract section ID from URL params
   - Authenticate user session
   - Validate section ID format
   - Parse and validate JSON request body
   - Call SectionService.reorderSection with validated inputs

4. **Implement response handling**:
   - Return success response with updated section data
   - Use handleApiError for comprehensive error handling and logging

5. **Testing**:
   - Unit tests for service method
   - Integration tests for endpoint
   - Test edge cases: invalid positions, non-existent sections, unauthorized access
   - Test position bounds validation
   - Test concurrent reordering scenarios
