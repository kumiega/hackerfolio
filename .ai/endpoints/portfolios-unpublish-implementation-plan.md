# API Endpoint Implementation Plan: POST `/api/v1/portfolios/:id/unpublish`

## 1. Endpoint Overview
This endpoint allows authenticated users to unpublish their portfolios. It sets the portfolio's `is_published` flag to `false` and clears the `published_at` timestamp. The operation is idempotent - if the portfolio is already unpublished, the request succeeds without making changes. This endpoint is the counterpart to the portfolio publish endpoint and allows users to remove their portfolios from public visibility.

## 2. Request Details
- **HTTP Method**: POST
- **URL Structure**: `/api/v1/portfolios/:id/unpublish`
- **Authentication**: Required (Supabase session)
- **Parameters**:
  - **Required**:
    - `id` (string): Portfolio UUID from URL path parameter, must be valid UUID format
  - **Optional**: None
- **Request Body**: Empty (no body expected)
- **Content-Type**: Not applicable (empty body)

## 3. Used Types
- **Response DTO**: `PublishStatusDto`
  ```typescript
  export interface PublishStatusDto {
    is_published: boolean;
    published_at: string | null;
  }
  ```
- **Command Models**: None (empty request body)

## 4. Response Details
- **Success Response (200)**:
  ```json
  {
    "data": {
      "is_published": false,
      "published_at": null
    }
  }
  ```
- **Error Responses**:
  - **400**: Invalid portfolio ID format or unexpected request body
  - **401**: User not authenticated
  - **404**: Portfolio does not exist or user does not own it
  - **500**: Internal server error

## 5. Data Flow
1. **Path Parameter Extraction**: Extract `id` from URL path
2. **Input Validation**:
   - Validate `id` is a valid UUID format
   - Validate request body is empty
3. **Authentication**: Verify user session via `AuthService.getCurrentSession()`
4. **Authorization**: RLS policies ensure only portfolio owners can unpublish
5. **Business Logic**: Call `PortfolioService.unpublishPortfolio()` which:
   - Verifies portfolio ownership
   - Checks if already unpublished (idempotent)
   - Updates database: `is_published = false`, `published_at = null`
   - Returns updated status
6. **Response**: Return success response with updated `PublishStatusDto`

## 6. Security Considerations
- **Authentication**: Required via Supabase session tokens
- **Authorization**: Row Level Security (RLS) policies restrict access to portfolio owners only
- **Input Validation**: UUID format validation prevents malformed IDs
- **SQL Injection**: Mitigated by Supabase client's parameterized queries
- **IDOR Protection**: RLS ensures users cannot unpublish others' portfolios
- **Rate Limiting**: Should be implemented at infrastructure level for API protection

## 7. Error Handling
- **Error Logging**: All errors logged to `app_errors` table via `handleApiError()` with context including:
  - Request ID
  - Endpoint information
  - User ID
  - Portfolio ID
  - Stack traces for debugging
- **Error Response Format**: Consistent API error envelope with error codes and messages
- **Database Errors**: Caught and converted to appropriate HTTP status codes
- **Authentication Errors**: Return 401 for unauthenticated requests
- **Ownership Errors**: Return 404 (via RLS) when user doesn't own portfolio

## 8. Performance Considerations
- **Database Queries**: Minimal - single SELECT then single UPDATE query
- **Indexing**: Leverages existing B-tree indexes on `portfolios(user_id)` and `portfolios(id)`
- **Idempotency**: Check current status before update to avoid unnecessary writes
- **Response Size**: Minimal JSON payload
- **Caching**: No caching needed (immediate consistency required)
- **Connection Pooling**: Uses Supabase connection pooling automatically

## 9. Implementation Steps
1. **✅ Add Service Method**: Extend `PortfolioService` with `unpublishPortfolio()` method following existing patterns
2. **✅ Create API Endpoint**: Implement `/api/v1/portfolios/[id]/unpublish.ts` following publish endpoint structure
3. **✅ Input Validation**: UUID format validation and empty body checks
4. **✅ Authentication**: Session verification via `AuthService`
5. **✅ Business Logic**: Database update with ownership verification
6. **✅ Error Handling**: Comprehensive error catching and logging
7. **✅ Testing**: Build verification and linting checks passed

## 10. Testing Scenarios
- **200 Success**: Valid authenticated request unpublishes portfolio
- **200 Idempotent**: Already unpublished portfolio succeeds without changes
- **400 Invalid ID**: Malformed UUID returns validation error
- **400 Body Present**: Non-empty request body returns validation error
- **401 Unauthenticated**: Missing/invalid token returns unauthorized
- **404 Not Found**: Non-existent portfolio or wrong owner returns not found
- **500 Database Error**: Connection issues return internal error

## 11. Dependencies
- **Supabase Client**: Database operations and RLS
- **AuthService**: Session management and authentication
- **PortfolioService**: Business logic encapsulation
- **Error Handler**: Centralized error processing and logging
- **UUID Utils**: Input validation utilities

## 12. Future Considerations
- **Audit Logging**: Could add portfolio unpublish events to audit trail
- **Notifications**: Could notify followers when portfolio is unpublished
- **Soft Delete**: Consider soft unpublish vs hard unpublish for analytics
- **Bulk Operations**: Future bulk unpublish for multiple portfolios
- **Scheduling**: Could add scheduled unpublish functionality
