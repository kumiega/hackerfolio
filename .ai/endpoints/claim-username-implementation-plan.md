# API Endpoint Implementation Plan: Claim Username

## 1. Endpoint Overview
This endpoint allows authenticated users to claim a unique username that becomes their permanent identifier in the system. The username can only be set once and cannot be changed afterward. The operation is protected by authentication and includes comprehensive validation to ensure username uniqueness and format compliance.

## 2. Request Details
- **HTTP Method**: POST
- **URL Structure**: `/api/v1/auth/claim-username`
- **Parameters**: None (body-only endpoint)
- **Request Body**:
```json
{
  "username": "string" // Required, matches ^[a-z0-9-]{3,30}$
}
```

## 3. Used Types
- **Request DTO**: `ClaimUsernameCommand`
- **Response DTO**: `ApiSuccessResponse<UserProfileDto>`
- **Error DTO**: `ApiErrorResponse`

## 4. Response Details
- **Success Response (200)**:
```json
{
  "data": {
    "id": "uuid",
    "username": "string"
  }
}
```
- **Error Responses**:
  - **400**: Invalid username format
  - **409**: Username already taken or user already has username set
  - **401**: User not authenticated
  - **500**: Internal server error

## 5. Data Flow
1. **Authentication Check**: Validate user session via Supabase auth
2. **Input Validation**: Parse and validate request body using Zod schema
3. **Format Validation**: Verify username matches regex pattern
4. **Authorization Check**: Ensure user doesn't already have a username set
5. **Availability Check**: Query database to ensure username isn't taken by others
6. **Database Update**: Update user_profiles table with new username
7. **Response**: Return updated user profile data

## 6. Security Considerations
- **Authentication Required**: Endpoint requires valid Supabase session
- **Authorization**: Users can only claim username for themselves (enforced by RLS)
- **Input Validation**: Strict regex validation prevents malformed usernames
- **Username Enumeration Protection**: Consistent error responses prevent username discovery
- **Rate Limiting**: Consider implementing to prevent brute-force username checking
- **Data Sanitization**: Parameterized queries prevent SQL injection
- **Session Security**: Relies on Supabase JWT validation and expiration

## 7. Error Handling
- **400 - Invalid Format**: Username doesn't match `^[a-z0-9-]{3,30}$` pattern
- **409 - Username Taken**: Username already exists in user_profiles table (case-insensitive)
- **409 - Already Set**: Current user's profile already has a username assigned
- **401 - Unauthenticated**: No valid Supabase session or expired token
- **500 - Internal Error**: Database connection issues, constraint violations, or unexpected errors

All errors are logged to the `app_errors` table with appropriate severity levels and context data.

## 8. Performance Considerations
- **Database Queries**: Efficient single-row update with proper indexing
- **Connection Pooling**: Leverages Supabase connection management
- **Caching**: No caching needed (one-time operation)
- **Rate Limiting**: Consider implementing to prevent abuse
- **Concurrent Requests**: Database constraints handle race conditions

## 9. Implementation Steps

### Step 1: Extend AuthService
Add `claimUsername` method to the existing `AuthService` class:

```typescript
static async claimUsername(
  supabase: SupabaseClient, 
  username: string
): Promise<UserProfileDto> {
  // Implementation logic
}
```

### Step 2: Create API Route Handler
Create `/src/pages/api/v1/auth/claim-username.ts` with:
- POST handler implementation
- Zod schema validation
- Error handling and logging
- Response formatting

### Step 3: Implement Zod Schema
Define username validation schema using Zod for request body validation.

### Step 4: Database Operations
Implement the core business logic:
- Check current user authentication
- Validate username format
- Check username availability
- Check if user already has username set
- Update user profile with new username

### Step 5: Error Handling
Implement comprehensive error handling for all scenarios:
- Authentication failures
- Validation errors
- Database constraint violations
- Unexpected server errors