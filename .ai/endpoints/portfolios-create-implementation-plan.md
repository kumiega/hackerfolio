# API Endpoint Implementation Plan: POST /api/v1/portfolios

## 1. Endpoint Overview
This endpoint creates a new portfolio for the currently authenticated user. It enforces a strict 1:1 relationship between users and portfolios, ensuring each user can have only one portfolio. The endpoint validates input data, checks for existing portfolios, and returns the created portfolio object upon successful creation.

## 2. Request Details
- **HTTP Method**: POST
- **URL Structure**: `/api/v1/portfolios`
- **Authentication**: Required (Supabase Auth)
- **Content-Type**: `application/json`

### Parameters
**Required:**
- `title`: string (1-100 characters, trimmed)

**Optional:**
- `description`: string | null (unlimited length, nullable)

### Request Body Schema
```json
{
  "title": "My Portfolio Title",
  "description": "Optional portfolio description"
}
```

## 3. Used Types
### Request Command Model
```typescript
export type CreatePortfolioCommand = Pick<
  TablesInsert<'portfolios'>,
  'title' | 'description'
>;
```

### Response DTO
```typescript
export type PortfolioDto = Pick<
  Tables<'portfolios'>,
  'id' | 'user_id' | 'is_published' | 'published_at' | 'title' | 'description' | 'created_at'
>;
```

## 4. Response Details

### Success Response (201 Created)
```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "is_published": false,
    "published_at": null,
    "title": "My Portfolio Title",
    "description": "Optional portfolio description",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Error Responses
- **409 Conflict**: Portfolio already exists for this user
- **422 Unprocessable Entity**: Validation errors
- **401 Unauthorized**: User not authenticated
- **500 Internal Server Error**: Server-side errors

## 5. Data Flow
1. **Authentication Check**: Verify user is authenticated via Supabase Auth
2. **Input Validation**: Validate request body against Zod schema
3. **Portfolio Existence Check**: Query database to ensure user doesn't already have a portfolio
4. **Portfolio Creation**: Insert new portfolio record with user_id, title, and description
5. **Response Formation**: Return created portfolio data in standardized format
6. **Error Logging**: Log any unexpected errors to app_errors table

### Database Interactions
- **Read**: Check existing portfolios for user
- **Write**: Insert new portfolio record
- **Error Logging**: Insert error records if needed

## 6. Security Considerations
- **Authentication**: Endpoint requires authenticated user via Supabase Auth
- **Authorization**: RLS policies ensure users can only create portfolios for themselves
- **Input Validation**: Strict validation prevents malicious data injection
- **Rate Limiting**: Consider implementing rate limiting to prevent abuse
- **Data Sanitization**: Trim strings and validate character limits
- **SQL Injection Protection**: Use parameterized queries via Supabase client

## 7. Error Handling
### Validation Errors (422)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "title": ["Title must be between 1 and 100 characters"]
    },
    "requestId": "uuid"
  }
}
```

### Conflict Error (409)
```json
{
  "error": {
    "code": "PORTFOLIO_ALREADY_EXISTS",
    "message": "A portfolio already exists for this user",
    "details": null,
    "requestId": "uuid"
  }
}
```

### Authentication Error (401)
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "details": null,
    "requestId": "uuid"
  }
}
```

### Server Error (500)
```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred",
    "details": null,
    "requestId": "uuid"
  }
}
```

## 8. Performance Considerations
- **Database Queries**: Minimal - single existence check + single insert
- **Indexing**: Leverages existing indexes on portfolios(user_id)
- **Connection Pooling**: Uses Supabase connection pooling
- **Caching**: No caching needed for creation operations
- **Response Size**: Small JSON response
- **Concurrent Requests**: Database UNIQUE constraint handles race conditions

## 9. Implementation Steps

### Step 1: Set up API Route Structure
Create `/src/pages/api/v1/portfolios/index.ts` following Astro API route conventions:
- Export `prerender = false`
- Use POST handler
- Extract supabase client from `context.locals`

### Step 2: Implement Input Validation
Create Zod schema for request validation:
```typescript
const createPortfolioSchema = z.object({
  title: z.string().min(1).max(100).trim(),
  description: z.string().nullable().optional()
});
```

### Step 3: Extend Portfolio Service
Extend `src/lib/services/portfolio.service.ts` with:
- `createPortfolio(userId: string, command: CreatePortfolioCommand): Promise<PortfolioDto>`
- `checkPortfolioExists(userId: string): Promise<boolean>`

### Step 4: Implement Route Handler Logic
1. Extract and validate user authentication
2. Parse and validate request body
3. Check if portfolio already exists
4. Create portfolio via service
5. Return success response or handle errors

### Step 5: Error Logging Integration
Implement error logging for unexpected failures:
- Use `log_app_error` RPC function
- Log with appropriate severity levels
- Include relevant context (user_id, request_id, etc.)

### Step 6: Add Middleware Integration
Ensure proper middleware integration for:
- Request ID generation
- Error response formatting
- CORS handling (if needed)