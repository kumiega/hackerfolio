# API Endpoint Implementation Plan: POST `/api/v1/portfolios/:id/publish`

## 1. Endpoint Overview
This endpoint allows authenticated users to publish their portfolio. The portfolio must meet minimum requirements of having at least one section and one component total across all sections. Upon successful publication, the portfolio's `is_published` flag is set to true and `published_at` timestamp is updated to the current time.

## 2. Request Details
- **HTTP Method**: POST
- **URL Structure**: `/api/v1/portfolios/:id/publish`
  - `:id` - Portfolio UUID (required, path parameter)
- **Parameters**:
  - **Required**: `id` (portfolio UUID from URL path)
  - **Optional**: None
- **Request Body**: None (empty body expected)
- **Authentication**: Required (user must be authenticated)
- **Authorization**: User must own the portfolio

## 3. Response Details
### Success Response (200)
```json
{
  "data": {
    "is_published": true,
    "published_at": "2024-10-11T10:30:00.000Z"
  }
}
```

### Error Responses
- **401 Unauthorized**: User not authenticated
- **403 Forbidden**: User does not own the portfolio
- **404 Not Found**: Portfolio does not exist
- **409 Conflict**: Portfolio does not meet publication requirements (missing sections or components)
- **500 Internal Server Error**: Unexpected server error

## 4. Data Flow
1. **Authentication Check**: Verify user is authenticated via Supabase session
2. **Portfolio Ownership Verification**: Ensure the authenticated user owns the portfolio
3. **Requirements Validation**: Check portfolio has ≥1 section and ≥1 component total
4. **Publication Update**: Update portfolio with `is_published = true` and `published_at = now()`
5. **Response**: Return updated publication status

## 5. Security Considerations
- **Authentication Required**: All requests must include valid authentication token
- **Ownership Verification**: RLS policies ensure users can only access their own portfolios
- **Input Validation**: Portfolio ID must be a valid UUID format
- **SQL Injection Prevention**: All database queries use parameterized queries
- **Rate Limiting**: Consider implementing rate limiting to prevent abuse
- **Audit Trail**: All publication events are logged with user and portfolio context

## 6. Error Handling
- **401 UNAUTHENTICATED**: User session invalid or expired
- **403 NOT_OWNER**: Portfolio exists but belongs to different user
- **404 PORTFOLIO_NOT_FOUND**: Portfolio UUID does not exist
- **409 UNMET_REQUIREMENTS**: Portfolio missing required sections or components
- **500 DATABASE_ERROR**: Database connection or query failure
- **500 INTERNAL_ERROR**: Unexpected application error

All errors are logged to the `app_errors` table with appropriate severity levels and context information.

## 7. Performance Considerations
- **Database Queries**: Single SELECT query to check requirements, single UPDATE for publication
- **Indexes**: Leverages existing B-tree indexes on `portfolios(user_id)` and `sections(portfolio_id)`
- **Connection Pooling**: Uses Supabase connection pooling for optimal performance
- **Response Time**: Expected <100ms for typical portfolios
- **Scalability**: Query performance remains consistent regardless of portfolio size

## 8. Implementation Steps

### 8.1 Add publishPortfolio Method to PortfolioService
Add a new static method to `src/lib/services/portfolio.service.ts`:

```typescript
/**
 * Publishes a portfolio if it meets the minimum requirements
 *
 * @param supabase - Supabase client instance from context.locals
 * @param portfolioId - ID of the portfolio to publish
 * @param userId - ID of the user making the request (for ownership verification)
 * @returns Promise<PublishStatusDto> - Updated publication status
 * @throws PortfolioError with code 'PORTFOLIO_NOT_FOUND' if portfolio doesn't exist or user doesn't own it
 * @throws PortfolioError with code 'UNMET_REQUIREMENTS' if portfolio doesn't have required sections/components
 * @throws PortfolioError with code 'DATABASE_ERROR' if database operations fail
 */
static async publishPortfolio(
  supabase: SupabaseClient,
  portfolioId: string,
  userId: string
): Promise<PublishStatusDto> {
  // Implementation details in actual code
}
```

### 8.2 Create API Endpoint Handler
Create `src/pages/api/v1/portfolios/[id]/publish.ts` with the following structure:

```typescript
import type { APIRoute } from "astro";
import type { ApiSuccessResponse, ApiErrorResponse, PublishStatusDto } from "@/types";
import { PortfolioService } from "@/lib/services/portfolio.service";
import { AuthService } from "@/lib/services/auth.service";
import { logError } from "@/lib/error-utils";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  // Implementation with proper error handling
};
```

### 8.3 Implement Business Logic in PortfolioService.publishPortfolio
1. **Validate Portfolio Ownership**: Query portfolio with user_id filter
2. **Check Requirements**: Count sections and components for the portfolio
3. **Update Publication Status**: Set is_published=true and published_at=now()
4. **Return Status**: Return PublishStatusDto with updated values

### 8.4 Implement API Endpoint Logic
1. **Extract Parameters**: Get portfolio ID from URL params
2. **Authenticate User**: Verify user session
3. **Call Service Method**: Execute PortfolioService.publishPortfolio
4. **Handle Errors**: Map service errors to appropriate HTTP status codes
5. **Return Response**: Format and return success/error responses

### 8.5 Add Error Constants
Consider adding error constants to avoid magic strings:
```typescript
export const ERROR_CODES = {
  PORTFOLIO_NOT_FOUND: 'PORTFOLIO_NOT_FOUND',
  UNMET_REQUIREMENTS: 'UNMET_REQUIREMENTS',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  NOT_OWNER: 'NOT_OWNER'
} as const;
```

## 9. Database Queries Required

### Check Portfolio Ownership and Requirements
```sql
-- Get portfolio with ownership check
SELECT id, user_id, is_published, published_at 
FROM portfolios 
WHERE id = $1 AND user_id = $2;

-- Count sections for portfolio
SELECT COUNT(*) as section_count 
FROM sections 
WHERE portfolio_id = $1;

-- Count components across all sections
SELECT COUNT(*) as component_count 
FROM components c
JOIN sections s ON s.id = c.section_id
WHERE s.portfolio_id = $1;
```

### Update Publication Status
```sql
UPDATE portfolios 
SET is_published = true, published_at = now() 
WHERE id = $1 AND user_id = $2 
RETURNING is_published, published_at;
```

## 10. Dependencies
- **Existing Services**: AuthService, PortfolioService, error logging utilities
- **Types**: PublishStatusDto, ApiSuccessResponse, ApiErrorResponse
- **Database**: portfolios, sections, components tables with RLS policies
- **External**: None (pure database operations)
