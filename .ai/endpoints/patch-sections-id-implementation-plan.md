# API Endpoint Implementation Plan: PATCH `/api/v1/sections/:id`

## 1. Endpoint Overview

This endpoint allows authenticated users to update the name and/or visibility of an existing section in their portfolio. The endpoint enforces ownership through Row Level Security (RLS) policies, ensuring users can only modify sections from portfolios they own. Changes are atomic and return the updated section data.

## 2. Request Details

- **HTTP Method**: PATCH
- **URL Structure**: `/api/v1/sections/:id`
  - `id`: Section UUID (required path parameter)
- **Parameters**:
  - **Required**: `id` (path parameter, valid UUID string)
  - **Optional**: None
- **Request Body**: JSON object with partial section update data
  ```json
  {
    "name": "string",     // optional, max 150 characters
    "visible": true       // optional, boolean
  }
  ```
- **Authentication**: Required (Supabase JWT via `Authorization: Bearer <token>`)
- **Content-Type**: `application/json`

## 3. Response Details

### Success Response (200)
```json
{
  "data": {
    "id": "uuid",
    "name": "string",
    "position": 1,
    "visible": true
  }
}
```

### Error Responses
- **400 Bad Request**: Invalid section ID format or malformed JSON
- **401 Unauthorized**: User not authenticated
- **403 Forbidden**: User does not own the section (enforced by RLS)
- **404 Not Found**: Section does not exist
- **422 Unprocessable Entity**: Validation errors (name too long, invalid data types)
- **500 Internal Server Error**: Database or server errors

## 4. Data Flow

1. **Authentication**: Validate Supabase JWT token
2. **Parameter Validation**: Validate section ID format (UUID)
3. **Body Validation**: Parse JSON and validate against Zod schema
4. **Authorization**: RLS policies ensure user owns the section through portfolio ownership
5. **Service Layer**: Call `SectionService.updateSection()` with validated data
6. **Database Update**: Update section record with provided fields
7. **Response**: Return updated section data

## 5. Security Considerations

- **Authentication**: Required Supabase JWT validation
- **Authorization**: Database-level RLS policies prevent unauthorized access
- **Input Validation**: Comprehensive validation using Zod schemas
- **SQL Injection Protection**: Parameterized queries via Supabase client
- **Data Sanitization**: String trimming and length limits
- **Audit Trail**: All changes logged through error logging system if issues occur

## 6. Error Handling

### Validation Errors (422)
- Section ID not a valid UUID format
- Name exceeds 150 character limit
- Visible field is not a boolean
- Invalid JSON structure

### Authorization Errors (401/403/404)
- **401**: Missing or invalid JWT token
- **403**: User attempts to update section from portfolio they don't own (RLS enforced)
- **404**: Section with provided ID does not exist

### System Errors (500)
- Database connection failures
- Unexpected Supabase errors
- Internal server errors

### Error Logging
All errors are logged to the `app_errors` table with context including:
- User ID (when available)
- Section ID
- Request ID for tracing
- Error code and message
- Stack trace for debugging

## 7. Performance Considerations

- **Database Indexes**: Leverages existing B-tree indexes on `sections(id)` and portfolio ownership checks
- **Query Optimization**: Single UPDATE query with SELECT return
- **Response Size**: Minimal payload (only section fields)
- **Connection Pooling**: Uses Supabase connection pooling
- **Caching**: No caching needed for this mutation endpoint

## 8. Implementation Steps

1. **Create API Route File**
   - Location: `src/pages/api/v1/sections/[id].ts`
   - Export `prerender = false`
   - Implement PATCH handler following Astro APIRoute pattern

2. **Implement Input Validation**
   - Create Zod schema for update command validation
   - Validate section ID parameter format
   - Parse and validate JSON request body

3. **Implement Authentication & Authorization**
   - Extract user session using `AuthService.getCurrentSession()`
   - Let RLS policies handle ownership verification

4. **Integrate Service Layer**
   - Call `SectionService.updateSection()` with validated parameters
   - Handle service-level errors appropriately

5. **Implement Response Handling**
   - Return 200 with updated section data on success
   - Use `handleApiError()` for consistent error responses
   - Include request ID in all responses

6. **Add Comprehensive Error Handling**
   - Handle validation errors (400/422)
   - Handle authentication errors (401)
   - Handle authorization errors (403/404)
   - Handle system errors (500)

7. **Testing & Validation**
   - Unit tests for validation logic
   - Integration tests for database operations
   - End-to-end tests for complete request flow
   - Test error scenarios and edge cases

8. **Documentation Updates**
   - Update API specification documentation
   - Add endpoint to TODO list completion
   - Update any relevant README files

## 9. Dependencies

- **Existing Services**: `SectionService.updateSection()`, `AuthService.getCurrentSession()`
- **Error Handling**: `handleApiError()`, `createErrorResponse()`
- **Validation**: `zod` for schema validation
- **Types**: `UpdateSectionCommand`, `SectionDto`, `ApiSuccessResponse`

## 10. Code Structure

```
src/pages/api/v1/sections/[id].ts
├── PATCH handler
│   ├── Authentication
│   ├── Parameter validation
│   ├── Body parsing & validation
│   ├── Service call
│   └── Response formatting
└── Error handling wrapper
```

## 11. Testing Strategy

- **Unit Tests**: Validation logic, error mapping
- **Integration Tests**: Database operations, RLS enforcement
- **API Tests**: Complete request/response cycle
- **Security Tests**: Authorization bypass attempts
- **Performance Tests**: Load testing under concurrent updates
