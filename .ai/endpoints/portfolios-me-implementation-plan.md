# API Endpoint Implementation Plan: GET /api/v1/portfolios/me

## 1. Endpoint Overview
This endpoint retrieves the portfolio data for the currently authenticated user. It returns the user's portfolio information including ID, publication status, title, description, and timestamps. This is a read-only operation that requires user authentication.

## 2. Request Details
- **HTTP Method**: GET
- **URL Structure**: `/api/v1/portfolios/me`
- **Parameters**:
  - **Required**: None (authentication context provides user identification)
  - **Optional**: None
- **Request Body**: None (GET request)
- **Authentication**: Required (user must be authenticated via Supabase Auth)

## 3. Used Types
- **Response DTO**: `PortfolioDto` (from `src/types.ts`)
  ```typescript
  export type PortfolioDto = Pick<
    Tables<'portfolios'>,
    'id' | 'user_id' | 'is_published' | 'published_at' | 'title' | 'description' | 'created_at'
  >;
  ```
- **API Response**: `ApiSuccessResponse<PortfolioDto>`

## 4. Response Details
- **Success Response (200)**:
  ```json
  {
    "data": {
      "id": "uuid",
      "user_id": "uuid",
      "is_published": false,
      "published_at": null,
      "title": "string",
      "description": "string|null",
      "created_at": "iso"
    }
  }
  ```
- **Error Responses**:
  - **401 Unauthorized**: User not authenticated
  - **404 Not Found**: Portfolio not yet created for the user
  - **500 Internal Server Error**: Database or server errors

## 5. Data Flow
1. **Authentication Check**: Verify user is authenticated via Supabase Auth
2. **User Context**: Extract authenticated user ID from request context
3. **Database Query**: Query portfolios table for record matching user_id
4. **Data Transformation**: Map database result to PortfolioDto structure
5. **Response**: Return portfolio data or appropriate error

## 6. Security Considerations
- **Authentication Required**: Endpoint requires authenticated user via Supabase Auth
- **Authorization**: RLS policies ensure users can only access their own portfolio
- **Data Isolation**: Database-level RLS prevents unauthorized access to other users' portfolios
- **Input Sanitization**: No user input to sanitize (GET request with no parameters)
- **Rate Limiting**: Consider implementing rate limiting for portfolio access
- **Audit Logging**: All access attempts should be logged for security monitoring

## 7. Error Handling
- **401 Unauthorized**:
  - When: User is not authenticated
  - Response: Standard API error format with "UNAUTHORIZED" code
  - Logging: Log as warning with user context (if available)

- **404 Not Found**:
  - When: No portfolio exists for the authenticated user
  - Response: Standard API error format with "PORTFOLIO_NOT_FOUND" code
  - Logging: Log as info (expected when user hasn't created portfolio yet)

- **500 Internal Server Error**:
  - When: Database connection issues, unexpected errors
  - Response: Standard API error format with "INTERNAL_ERROR" code
  - Logging: Log as error with full context, stack trace, and user information

## 8. Performance Considerations
- **Database Indexing**: Rely on existing B-tree index on `portfolios(user_id)`
- **Query Optimization**: Single row lookup by user_id (should be fast)
- **Caching**: Consider caching portfolio data if accessed frequently
- **Connection Pooling**: Use Supabase connection pooling for efficient database access
- **Response Size**: Portfolio data is lightweight (single row with basic fields)

## 9. Implementation Steps

### 9.1 Create Portfolio Service (if not exists)
1. Create `src/lib/services/portfolio.service.ts`
2. Implement `getUserPortfolio(userId: string): Promise<PortfolioDto | null>`
3. Add proper error handling and logging
4. Extract database query logic following service pattern

### 9.2 Create API Endpoint File
1. Create `src/pages/api/v1/portfolios/me.ts`
2. Set `export const prerender = false` for API route
3. Import required dependencies:
   - Supabase client from context
   - Portfolio service
   - Error utilities
   - Response types

### 9.3 Implement Authentication Middleware
1. Use Astro's authentication context via `locals.supabase`
2. Extract authenticated user from request
3. Return 401 if user not authenticated
4. Proceed with user ID if authenticated

### 9.4 Implement Business Logic
1. Call portfolio service `getUserPortfolio(userId)`
2. Handle null result (portfolio not found) with 404
3. Transform data to PortfolioDto format
4. Return success response with portfolio data

### 9.5 Implement Error Handling
1. Wrap main logic in try-catch block
2. Log errors using `log_app_error` RPC function
3. Return appropriate HTTP status codes
4. Include request ID for error tracking

### 9.6 Add Input Validation
1. Validate authentication state (required)
2. No additional input validation needed for GET request

### 9.7 Testing Implementation
1. Test authenticated user with existing portfolio (200 response)
2. Test authenticated user without portfolio (404 response)
3. Test unauthenticated request (401 response)
4. Test database error scenarios (500 response)
5. Verify response format matches specification

### 9.8 Documentation and Code Review
1. Add JSDoc comments to endpoint function
2. Document error codes and scenarios
3. Ensure code follows clean code guidelines
4. Review for security best practices
