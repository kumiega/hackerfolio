# API Endpoint Implementation Plan: Generate Project Cards from GitHub

## 1. Endpoint Overview
This endpoint generates `card` components for selected GitHub repositories by automatically reading repository README files and extracting technology stack information. The generated components are automatically inserted into a specified section within the user's portfolio. This enables users to quickly populate their portfolio with project information without manual data entry.

## 2. Request Details
- **HTTP Method**: POST
- **URL Structure**: `/api/v1/imports/github/generate-project-cards`
- **Authentication**: Required (Supabase Auth)
- **Parameters**:
  - **Required**:
    - `section_id`: UUID string identifying the target section where components will be created
    - `repo_urls`: Array of valid GitHub repository URLs (e.g., `["https://github.com/user/repo"]`)
  - **Optional**:
    - `limit`: Number (default: 10, max: 10) - Maximum number of components to create

- **Request Body Schema** (Zod validation):
```typescript
{
  section_id: z.string().uuid(),
  repo_urls: z.array(z.string().url()).min(1).max(10),
  limit: z.number().min(1).max(10).optional().default(10)
}
```

## 3. Response Details
- **Success Response** (201 Created):
```json
{
  "data": {
    "created": 3,
    "components": [
      {
        "id": "uuid",
        "type": "card",
        "position": 1,
        "data": {
          "repo_url": "https://github.com/user/repo",
          "title": "Repository Title",
          "summary": "Auto-generated summary from README",
          "tech": ["JavaScript", "React", "Node.js"]
        }
      }
    ]
  }
}
```

- **Error Responses**:
  - `409 Conflict`: component_limit_reached - Would exceed portfolio's component limit (15)
  - `422 Unprocessable Entity`: validation - Invalid input data
  - `401 Unauthorized`: User not authenticated or doesn't own the section
  - `404 Not Found`: Section not found
  - `502 Bad Gateway`: GitHub API unavailable
  - `429 Too Many Requests`: GitHub API rate limit exceeded

## 4. Data Flow
1. **Input Validation**: Validate request body using Zod schema
2. **Authentication Check**: Verify user is authenticated via Supabase Auth
3. **Authorization Check**: Verify user owns the target section (RLS policy enforcement)
4. **Resource Limits Check**: Verify component creation won't exceed portfolio limits (15 components)
5. **GitHub Data Extraction**:
   - For each repository URL, fetch repository information via GitHub API
   - Retrieve README content and parse for title, description, and tech stack
   - Apply rate limiting to prevent API abuse
6. **Component Generation**:
   - Transform extracted data into `ProjectCardComponentData` format
   - Generate unique positions for new components
7. **Database Transaction**:
   - Insert multiple components in a single transaction
   - Update section timestamps if needed
8. **Response Assembly**: Return creation count and component details

## 5. Security Considerations
- **Authentication**: Required Supabase Auth session
- **Authorization**: RLS policies ensure users can only create components in sections they own
- **Input Validation**: Strict Zod validation prevents malformed data
- **Rate Limiting**: GitHub API calls are rate-limited to prevent abuse
- **URL Validation**: GitHub URLs are validated to prevent malicious redirects
- **Data Sanitization**: Extracted content is sanitized before storage
- **Resource Limits**: Component count limits prevent database bloat attacks

## 6. Error Handling
- **Validation Errors (422)**: Invalid section_id format, malformed GitHub URLs, limit out of range
- **Authorization Errors (401/403)**: Missing authentication, section ownership violation
- **Resource Errors (404)**: Section not found
- **Business Logic Errors (409)**: Component limit exceeded (15 per portfolio)
- **External Service Errors (502/429)**: GitHub API failures, rate limiting
- **Server Errors (500)**: Database failures, unexpected processing errors

All errors are logged to the `app_errors` table with appropriate severity levels and context information including user_id, section_id, and request details.

## 7. Performance Considerations
- **Batch Processing**: Multiple components created in single database transaction
- **Rate Limiting**: GitHub API calls throttled to respect rate limits and prevent bottlenecks
- **Concurrent Processing**: Sequential processing of repositories to avoid overwhelming external APIs
- **Caching**: Consider caching GitHub repository metadata for frequently accessed repos
- **Database Optimization**: Bulk insert operations for component creation
- **Timeout Handling**: GitHub API calls have reasonable timeouts to prevent hanging requests

## 8. Implementation Steps

### 8.1 API Route Setup (`src/pages/api/v1/imports/github/generate-project-cards.ts`)
1. Export `const prerender = false` for dynamic API route
2. Implement POST handler function
3. Set up Supabase client from `context.locals.supabase`
4. Apply rate limiting middleware

### 8.2 Input Validation
1. Create Zod schema for request validation
2. Validate request body parameters
3. Return 422 for validation failures with detailed error messages

### 8.3 Authorization & Business Logic Validation
1. Verify user authentication via Supabase Auth
2. Check section ownership via database query (RLS will handle this)
3. Verify section exists
4. Check current component count against limits (15 per portfolio)
5. Return appropriate error codes for violations

### 8.4 GitHub Data Extraction Service
1. Extend existing GitHub service (`src/lib/services/github.service.ts`)
2. Implement repository data extraction methods:
   - `fetchRepositoryInfo(url: string)`: Get basic repo metadata
   - `fetchReadmeContent(owner: string, repo: string)`: Get README content
   - `extractTechStack(content: string)`: Parse tech stack from README
   - `extractProjectSummary(content: string)`: Generate project description
3. Implement rate limiting for GitHub API calls
4. Handle GitHub API errors gracefully

### 8.5 Component Creation Service
1. Create or extend component service for batch operations
2. Implement `createProjectCardComponents()` method
3. Handle position assignment for new components
4. Execute database transaction for bulk insert

### 8.6 Response Assembly & Error Handling
1. Format successful response with created count and component details
2. Implement comprehensive error logging to `app_errors` table
3. Return appropriate HTTP status codes for all error scenarios
4. Include request IDs for error tracking

### 8.7 Testing Strategy
1. Unit tests for validation logic
2. Integration tests for GitHub API interactions
3. Database transaction tests for component creation
4. Error handling tests for various failure scenarios
5. Rate limiting tests to prevent API abuse

### 8.8 Documentation Updates
1. Update API documentation with endpoint details
2. Add examples for request/response formats
3. Document error codes and scenarios
