# API Endpoint Implementation Plan: GET /api/v1/portfolios/:portfolioId/sections

## 1. Endpoint Overview
This endpoint retrieves a paginated list of sections for a specific portfolio, ordered by the specified criteria. It requires authentication and ensures that only the portfolio owner can access their sections through Row Level Security (RLS) policies.

## 2. Request Details
- **HTTP Method**: GET
- **URL Structure**: `/api/v1/portfolios/:portfolioId/sections`
- **Authentication**: Required (Supabase JWT via Authorization header)
- **Parameters**:
  - **Required**:
    - `portfolioId` (path parameter): UUID string identifying the portfolio
  - **Optional**:
    - `page` (query): number, default 1, minimum 1
    - `per_page` (query): number, default 20, maximum 100
    - `sort` (query): string, one of ["position", "name", "created_at"], default "position"
    - `order` (query): string, one of ["asc", "desc"], default "asc"

## 3. Used Types
- **Request Validation**: `SectionListQuery` (extends `PaginationQuery` and `SortingQuery`)
- **Response Data**: `SectionDto[]` (array of section objects)
- **Response Envelope**: `ApiSuccessResponse<SectionDto[]>` with pagination meta
- **Error Response**: `ApiErrorResponse`

## 4. Response Details
- **Success Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "position": 1,
      "visible": true
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 3,
    "total_pages": 1
  }
}
```
- **Error Responses**:
  - `400`: Invalid portfolioId format or invalid query parameters
  - `401`: User not authenticated
  - `403`: User is not the portfolio owner (enforced by RLS)
  - `404`: Portfolio not found
  - `500`: Internal server error

## 5. Data Flow
1. **Authentication**: Validate Supabase JWT and extract user ID
2. **Parameter Validation**: Validate portfolioId format and query parameters using Zod
3. **Ownership Verification**: Query validates portfolio exists and user owns it (RLS enforcement)
4. **Data Retrieval**: Execute paginated query with sorting on sections table
5. **Response Construction**: Build paginated response with meta information
6. **Error Handling**: Catch and appropriately handle various error conditions

## 6. Security Considerations
- **Authentication**: Required JWT validation prevents unauthorized access
- **Authorization**: RLS policies ensure users can only access sections from portfolios they own
- **Input Validation**: UUID format validation prevents injection attacks
- **Rate Limiting**: Standard API rate limiting applies (60 req/min/IP)
- **Data Exposure**: No sensitive data exposed beyond section metadata
- **DoS Protection**: Maximum 100 items per page prevents excessive resource usage

## 7. Error Handling
- **Validation Errors (400)**: Invalid portfolioId UUID format or malformed query parameters
- **Authentication Errors (401)**: Missing or invalid JWT token
- **Authorization Errors (403)**: User attempting to access sections from portfolio they don't own (RLS enforced)
- **Not Found Errors (404)**: Portfolio with specified ID doesn't exist or user doesn't own it
- **Server Errors (500)**: Database connectivity issues, unexpected exceptions
- **Error Logging**: All 500 errors logged to `app_errors` table with full context

## 8. Performance Considerations
- **Database Indexes**: Leverages existing indexes on `sections(portfolio_id, position)` and `sections(portfolio_id)`
- **Query Optimization**: Uses efficient SELECT with LIMIT/OFFSET for pagination
- **RLS Performance**: Ownership checks are index-supported through portfolio relationship
- **Memory Usage**: Paginated responses prevent large result sets
- **Caching**: No caching implemented (portfolio sections may change frequently)

## 9. Implementation Steps
1. **Create SectionService**:
   - Add `src/lib/services/section.service.ts`
   - Implement `listSections()` method with pagination and sorting
   - Handle database errors appropriately

2. **Update Error Constants**:
   - Add section-related error codes to `src/lib/error-constants.ts`

3. **Create API Endpoint**:
   - Create `src/pages/api/v1/portfolios/[portfolioId]/sections/index.ts`
   - Implement Zod validation schema for query parameters
   - Follow existing error handling patterns
   - Use `handleApiError` utility for consistent error responses

4. **Add Request Validation**:
   - Create Zod schema for `SectionListQuery` validation
   - Validate portfolioId as UUID format
   - Parse and validate pagination/sorting parameters

5. **Implement Service Logic**:
   - Query sections with ownership verification
   - Apply sorting and pagination
   - Calculate total count for meta information
   - Return formatted response data

6. **Error Handling Integration**:
   - Integrate with existing error handling utilities
   - Ensure proper error logging for debugging
   - Return appropriate HTTP status codes

7. **Testing**:
   - Unit tests for SectionService methods
   - Integration tests for API endpoint
   - Test various pagination and sorting scenarios
   - Test error conditions and security scenarios

## 10. Dependencies
- **Existing Services**: AuthService for authentication, error handling utilities
- **Database Tables**: `sections`, `portfolios` (with RLS policies)
- **Types**: `SectionDto`, `SectionListQuery`, `ApiSuccessResponse`, `ApiErrorResponse`
- **External Libraries**: Zod for validation, existing Supabase client

## 11. Testing Strategy
- **Unit Tests**: SectionService methods with mocked database
- **Integration Tests**: Full API endpoint with real database
- **Security Tests**: Attempt access to other users' portfolios
- **Edge Cases**: Empty portfolios, invalid parameters, pagination boundaries
- **Performance Tests**: Large result sets with pagination
