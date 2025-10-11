# API Endpoint Implementation Plan: POST /api/v1/portfolios/:portfolioId/sections

## 1. Endpoint Overview
This endpoint creates a new section for a specific portfolio with a maximum limit of 10 sections per portfolio. It requires authentication and ensures that only the portfolio owner can create sections through Row Level Security (RLS) policies. The endpoint validates input data and enforces business rules around section limits.

## 2. Request Details
- **HTTP Method**: POST
- **URL Structure**: `/api/v1/portfolios/:portfolioId/sections`
- **Authentication**: Required (Supabase JWT via Authorization header)
- **Content-Type**: `application/json`
- **Parameters**:
  - **Required**:
    - `portfolioId` (path parameter): UUID string identifying the portfolio
  - **Request Body** (required):
    ```json
    {
      "name": "string (1-150 characters, trimmed)",
      "visible": "boolean"
    }
    ```

## 3. Used Types
- **Request Validation**: `CreateSectionCommand` (Zod schema)
- **Path Validation**: `portfolioIdSchema` (UUID validation)
- **Response Data**: `SectionDto` (created section object)
- **Response Envelope**: `ApiSuccessResponse<SectionDto>`
- **Error Response**: `ApiErrorResponse`

## 4. Response Details
- **Success Response (201)**:
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
  - `400`: Invalid portfolioId format
  - `401`: User not authenticated
  - `403`: User is not the portfolio owner (enforced by RLS)
  - `404`: Portfolio not found
  - `409`: Section limit reached (maximum 10 sections per portfolio)
  - `422`: Invalid request body (validation errors)
  - `500`: Internal server error

## 5. Data Flow
1. **Authentication**: Validate Supabase JWT and extract user ID
2. **Parameter Validation**: Validate portfolioId format using Zod
3. **Request Body Validation**: Parse and validate JSON body using CreateSectionCommand schema
4. **Section Limit Check**: Query current section count for portfolio
5. **Ownership Verification**: Database operations validate portfolio exists and user owns it (RLS enforcement)
6. **Section Creation**: Insert new section with auto-calculated position
7. **Response Construction**: Return created section data
8. **Error Handling**: Catch and appropriately handle various error conditions

## 6. Security Considerations
- **Authentication**: Required JWT validation prevents unauthorized access
- **Authorization**: RLS policies ensure users can only create sections in portfolios they own
- **Input Validation**: UUID format validation and length limits prevent injection attacks
- **Business Logic Validation**: Section limit enforcement prevents resource abuse
- **Data Sanitization**: String trimming and type validation prevent malformed data
- **Rate Limiting**: Standard API rate limiting applies (60 req/min/IP)
- **Audit Trail**: All operations logged for security monitoring

## 7. Error Handling
- **Validation Errors (400/422)**: Invalid portfolioId UUID format or malformed request body
- **Authentication Errors (401)**: Missing or invalid JWT token
- **Authorization Errors (403)**: User attempting to create sections in portfolio they don't own (RLS enforced)
- **Not Found Errors (404)**: Portfolio with specified ID doesn't exist or user doesn't own it
- **Business Logic Errors (409)**: Attempting to create more than 10 sections per portfolio
- **Server Errors (500)**: Database connectivity issues, unexpected exceptions
- **Error Logging**: All errors logged to `app_errors` table with full context including userId, portfolioId, and request details

## 8. Performance Considerations
- **Database Indexes**: Leverages existing indexes on `sections(portfolio_id)` for count queries
- **Query Optimization**: Efficient count query for section limit validation
- **RLS Performance**: Ownership checks are index-supported through portfolio relationship
- **Minimal Data Transfer**: Request/response payloads are small and focused
- **Connection Pooling**: Supabase handles connection optimization
- **Caching**: No caching needed (portfolio sections change frequently)

## 9. Implementation Steps

### 9.1 Update Error Constants
- Add `SECTION_LIMIT_REACHED: "SECTION_LIMIT_REACHED"` to `src/lib/error-constants.ts`

### 9.2 Update Validation Schemas
- Update `createSectionCommandSchema` in `src/lib/schemas/section.schemas.ts`:
  - Change `name: z.string().min(1).max(100).trim()` to `name: z.string().min(1).max(150).trim()`

### 9.3 Extend SectionService
- Modify `SectionService.createSection()` in `src/lib/services/section.service.ts`:
  - Add section count validation before insertion
  - Query current section count for the portfolio
  - Throw `SECTION_LIMIT_REACHED` error if count >= 10
  - Maintain existing position calculation logic

### 9.4 Update API Endpoint
- Modify `src/pages/api/v1/portfolios/[portfolioId]/sections/index.ts`:
  - Add POST handler alongside existing GET handler
  - Implement request body parsing and validation
  - Follow existing error handling patterns
  - Use `handleApiError` utility for consistent error responses
  - Return 201 status with created section data

### 9.5 Testing Implementation
- **Unit Tests**: SectionService.createSection with limit validation
- **Integration Tests**: Full POST endpoint with various scenarios
- **Security Tests**: Attempt creation in other users' portfolios
- **Edge Cases**: Section limit boundary, invalid inputs, database errors
- **Load Tests**: Concurrent section creation requests

## 10. Dependencies
- **Existing Services**: AuthService for authentication, SectionService for business logic
- **Database Tables**: `sections`, `portfolios` (with RLS policies)
- **Types**: `SectionDto`, `CreateSectionCommand`, `ApiSuccessResponse`, `ApiErrorResponse`
- **External Libraries**: Zod for validation, existing Supabase client
- **Error Handling**: Existing `handleApiError` utility and error constants

## 11. Rollback Strategy
- **Database**: No schema changes required (using existing tables)
- **Code**: Changes are additive, can be reverted by removing POST handler
- **Validation**: Schema updates are backward compatible (increased max length)
- **Error Codes**: New error code addition is non-disruptive

## 12. Monitoring and Observability
- **Error Tracking**: All errors automatically logged to `app_errors` table
- **Performance Metrics**: Standard Astro API metrics apply
- **Business Metrics**: Track section creation success/failure rates
- **Security Monitoring**: Log all authorization failures and validation errors
- **Usage Analytics**: Monitor section creation patterns for abuse detection
