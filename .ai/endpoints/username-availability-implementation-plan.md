# API Endpoint Implementation Plan: Username Availability Check

## 1. Endpoint Overview
This endpoint provides real-time username availability checking for user registration and profile setup. It allows clients to validate username uniqueness before submission, improving user experience by providing immediate feedback on username availability.

## 2. Request Details
- **HTTP Method**: GET
- **URL Structure**: `/api/v1/auth/username-availability`
- **Parameters**:
  - **Required**: 
    - `username` (query parameter) - The username to check for availability
- **Request Body**: None
- **Authentication**: None required (public endpoint)

## 3. Used Types
- **Response DTO**: `UsernameAvailabilityDto` - `{ available: boolean }`
- **API Response Wrapper**: `ApiSuccessResponse<UsernameAvailabilityDto>`
- **Error Response**: `ApiErrorResponse`

## 4. Response Details
- **Success Response (200)**:
  ```json
  {
    "data": {
      "available": true
    }
  }
  ```
- **Error Responses**:
  - **400 Bad Request**: Invalid username format
  - **500 Internal Server Error**: Unexpected server errors

## 5. Data Flow
1. **Input Validation**: Validate username format using Zod schema
2. **Database Query**: Check `user_profiles` table for existing username (case-insensitive)
3. **Response Construction**: Return availability status
4. **Error Handling**: Log errors to `app_errors` table for server issues

## 6. Security Considerations
- **Rate Limiting**: Consider implementing rate limiting to prevent username enumeration abuse
- **Input Validation**: Strict regex validation prevents injection and malformed input
- **Information Disclosure**: Error messages should not reveal whether a username exists (only format validation errors)
- **No Authentication**: Public endpoint - no user context required
- **SQL Injection Prevention**: Use parameterized queries via Supabase client

## 7. Error Handling
- **400 Invalid Format**:
  - Username doesn't match regex `^[a-z0-9-]{3,30}$`
  - Return generic validation error message
- **500 Internal Server Error**:
  - Database connection issues
  - Unexpected exceptions
  - Log full error details to `app_errors` table
  - Return generic error message to client

## 8. Performance Considerations
- **Database Query**: Simple SELECT query with index on username (consider adding if not exists)
- **Caching**: Could implement Redis caching for frequently checked usernames
- **Response Time**: Target sub-100ms response times for good UX
- **Load**: Expect high traffic during registration flows

## 9. Implementation Steps

### Step 1: Add Zod Validation Schema
Create validation schema for username format in the API route file.

### Step 2: Extend AuthService
Add `checkUsernameAvailability` static method to existing `AuthService` class:
- Accept Supabase client and username string
- Query `user_profiles` table for case-insensitive match
- Return boolean availability status
- Handle database errors appropriately

### Step 3: Create API Route Handler
Create `/src/pages/api/v1/auth/username-availability.ts`:
- Extract and validate `username` query parameter
- Call `AuthService.checkUsernameAvailability()`
- Return appropriate success/error responses
- Include comprehensive error logging for 500 errors

### Step 4: Add Error Logging Helper
Reuse existing `logError` helper function pattern from session endpoint for consistency.