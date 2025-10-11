# API Endpoint Implementation Plan: GET /api/v1/imports/github/repos

## 1. Endpoint Overview
This endpoint retrieves a list of GitHub repositories for the authenticated user through GitHub OAuth integration. It allows filtering by visibility (all/public/private), searching by repository name, and pagination support. The endpoint serves as a bridge between the application's authentication system and GitHub's API to provide users with their repository data for portfolio creation.

## 2. Request Details
- **HTTP Method:** GET
- **URL Structure:** `/api/v1/imports/github/repos`
- **Authentication:** Required (GitHub OAuth access token)
- **Parameters:**
  - **Required:** None (authentication required)
  - **Optional:**
    - `visibility`: string (enum: "all" | "public" | "private") - Filter repositories by visibility
    - `q`: string - Search query to filter repositories by name/description
    - `page`: number - Page number for pagination (default: 1)
    - `per_page`: number - Number of items per page (default: 30, max: 100)

## 3. Used Types
- **Request Validation:** Custom Zod schema for query parameters
- **Response DTO:** `GitHubRepoDto[]` with pagination meta
- **GitHub API Response Mapping:** Transform GitHub API response to `GitHubRepoDto`

## 4. Response Details
- **Success Response (200):**
  ```json
  {
    "data": [
      {
        "id": number,
        "name": string,
        "full_name": string,
        "stargazers_count": number,
        "html_url": string
      }
    ],
    "meta": {
      "page": number,
      "per_page": number,
      "total": number,
      "total_pages": number
    }
  }
  ```
- **Error Responses:**
  - `401`: Missing or invalid GitHub access token
  - `400`: Invalid query parameters
  - `429`: Rate limited by GitHub API
  - `500`: Internal server error or GitHub API failure

## 5. Data Flow
1. **Authentication Check:** Extract and validate GitHub access token from request
2. **Parameter Validation:** Validate and sanitize query parameters using Zod schema
3. **GitHub API Call:** Use GitHub API client to fetch user repositories with applied filters
4. **Data Transformation:** Map GitHub API response to standardized `GitHubRepoDto` format
5. **Response Formatting:** Structure response with data array and pagination metadata
6. **Error Handling:** Log errors to `app_errors` table and return appropriate HTTP status

## 6. Security Considerations
- **Token Management:** GitHub access token must be securely obtained and validated server-side
- **Authorization:** Ensure token belongs to authenticated user and has appropriate GitHub scopes
- **Rate Limiting:** Implement client-side and server-side rate limiting to respect GitHub's API limits (5000 requests/hour)
- **Input Validation:** Sanitize search queries and validate enum values to prevent injection attacks
- **Data Exposure:** Only return repositories owned by the authenticated user
- **Token Expiry:** Handle expired tokens gracefully with clear error messages

## 7. Error Handling
- **401 Unauthorized:** Missing GitHub token or invalid/expired token
- **400 Bad Request:** Invalid query parameters (wrong visibility value, invalid pagination numbers)
- **429 Too Many Requests:** GitHub API rate limit exceeded
- **500 Internal Server Error:** GitHub API failures, network issues, or unexpected errors
- **Error Logging:** All errors logged to `app_errors` table with appropriate severity levels and context

## 8. Performance Considerations
- **Caching:** Consider caching GitHub API responses for short periods (5-15 minutes) to reduce API calls
- **Pagination Limits:** Enforce reasonable pagination limits to prevent excessive data transfer
- **Concurrent Requests:** Handle multiple simultaneous requests efficiently
- **GitHub API Optimization:** Use GitHub's conditional requests and ETags where possible
- **Response Size:** Limit per_page to prevent large response payloads

## 9. Implementation Steps

### 9.1 Service Layer Setup
1. Create `src/lib/services/github.service.ts` for GitHub API integration
2. Implement GitHub API client with proper error handling and rate limiting
3. Add repository listing functionality with filtering and pagination
4. Create data transformation utilities to map GitHub API responses

### 9.2 Input Validation
1. Create Zod schema for query parameter validation in the API endpoint
2. Validate authentication requirements (GitHub token presence)
3. Implement parameter sanitization and type conversion

### 9.3 API Endpoint Implementation
1. Create `src/pages/api/v1/imports/github/repos.ts` following Astro API route conventions
2. Implement GET handler with proper error handling and response formatting
3. Add middleware integration for authentication and request context
4. Structure response using `ApiSuccessResponse` and `ApiErrorResponse` types

### 9.4 Error Handling and Logging
1. Implement comprehensive error catching for GitHub API failures
2. Add error logging to `app_errors` table using the `log_app_error` RPC function
3. Map different error types to appropriate HTTP status codes
4. Include request context in error logs for debugging

### 9.5 Security Implementation
1. Validate GitHub access token authenticity and scopes
2. Implement rate limiting middleware to prevent abuse
3. Add input sanitization to prevent injection attacks
4. Ensure proper CORS configuration for cross-origin requests

### 9.6 Testing and Validation
1. Create unit tests for GitHub service functionality
2. Implement integration tests for the API endpoint
3. Test error scenarios and edge cases
4. Validate pagination and filtering behavior
5. Test authentication and authorization flows

### 9.7 Documentation
1. Update API documentation with endpoint details
2. Document authentication requirements and token management
3. Include examples of request/response formats
4. Document error codes and troubleshooting steps
