# API Endpoint Implementation Plan: GET `/api/v1/ssr/portfolios/:username`

## 1. Endpoint Overview

This endpoint provides server-side rendering (SSR) support for publicly accessible portfolios. It retrieves published portfolio data including sections and components for a specific username. The endpoint is designed exclusively for server-side use and requires service role authentication to bypass Row Level Security (RLS) policies while ensuring only published portfolios are accessible.

### Key Characteristics:
- **Purpose**: SSR rendering of published user portfolios
- **Access Level**: Server-side only (not accessible from client)
- **Authentication**: Service role key required
- **Data Scope**: Published portfolios only with full section and component data

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/v1/ssr/portfolios/:username`
- **Parameters**:
  - **Required**:
    - `username` (path parameter): Username of the portfolio owner (must match `^[a-z0-9-]{3,30}$` regex pattern)
  - **Optional**: None
- **Request Body**: None (GET request)
- **Authentication**: Service role key via `Authorization: Bearer <service_role_key>` header

## 3. Used Types

### Response DTOs:
- `PublicPortfolioDto`: Main response structure containing username, portfolio details, and sections
- `PublicSectionDto`: Section data with associated components
- `ComponentDto`: Individual component data with type and configuration

### Command Models:
None required (GET endpoint)

## 4. Response Details

### Success Response (200):
```json
{
  "data": {
    "username": "string",
    "portfolio": {
      "title": "string",
      "description": "string",
      "published_at": "ISO 8601 timestamp"
    },
    "sections": [
      {
        "id": "uuid",
        "name": "string",
        "position": 1,
        "visible": true,
        "components": [
          {
            "id": "uuid",
            "type": "text|card|pills|social_links|list|gallery|bio",
            "position": 1,
            "data": {}
          }
        ]
      }
    ]
  }
}
```

### Error Responses:
- **401 Unauthorized**: Invalid or missing service role key
- **404 Not Found**: Username not found or portfolio not published
- **500 Internal Server Error**: Database or server errors

## 5. Security Considerations

### Authentication & Authorization:
- **Service Role Required**: Endpoint requires valid Supabase service role key
- **Server-Side Only**: Not accessible from client applications (enforced by service role requirement)
- **RLS Bypass**: Service role client bypasses Row Level Security for cross-user data access

### Input Validation:
- **Username Format**: Strict regex validation to prevent injection attacks
- **Path Parameter Sanitization**: Username validated against database records
- **Published Portfolio Filter**: Database query ensures only published portfolios are returned

### Rate Limiting & Abuse Prevention:
- **Rate Limiting**: Implemented via existing rate limiter middleware
- **Request Logging**: All requests logged with correlation IDs for monitoring
- **Error Logging**: Comprehensive error tracking in `app_errors` table

## 6. Error Handling

### Authentication Errors (401):
- Invalid service role key format
- Missing or malformed Authorization header
- Expired or revoked service role credentials

### Not Found Errors (404):
- Username does not exist in user_profiles
- User exists but has no portfolio
- Portfolio exists but is not published

### Server Errors (500):
- Database connection failures
- Query execution errors
- Unexpected application errors

### Error Logging:
- All errors logged to `app_errors` table with full context
- Request correlation IDs for tracing
- Stack traces captured for debugging
- User attribution where applicable

## 7. Performance Considerations

### Database Optimization:
- **Single Query with Joins**: Portfolio, sections, and components retrieved in one optimized query
- **Selective Field Retrieval**: Only required fields selected to minimize data transfer
- **Index Utilization**: Leverages existing B-tree indexes on user_id, portfolio_id, and position fields
- **Query Planning**: Efficient join order for portfolio → sections → components

### Caching Strategy:
- **No Application Caching**: Real-time data required for SSR
- **Database Caching**: Relies on PostgreSQL query caching
- **CDN Caching**: Public portfolio pages can be cached at edge level (implementation outside this endpoint)

### Response Size Management:
- **Data Filtering**: Only visible sections and components included
- **Pagination Not Required**: Complete portfolio data needed for SSR
- **JSON Optimization**: Minimal payload structure

## 8. Implementation Steps

### 1. Create Service Role Supabase Client
- Add service role key configuration to environment variables
- Create dedicated Supabase client instance for server-side operations
- Implement client initialization with proper error handling

### 2. Extend PortfolioService with Public Portfolio Method
- Add `getPublicPortfolioByUsername()` static method to `PortfolioService`
- Implement database query with joins: portfolios → user_profiles → sections → components
- Add filtering for published portfolios only
- Include proper error handling and logging

### 3. Create SSR Endpoint Handler
- Create `/api/v1/ssr/portfolios/[username].ts` endpoint file
- Implement service role authentication validation
- Add username parameter validation with regex pattern
- Integrate with PortfolioService for data retrieval

### 4. Implement Comprehensive Validation
- **Username Validation**: Regex pattern matching and database existence check
- **Authentication Validation**: Service role key verification
- **Business Logic Validation**: Published portfolio status verification

### 5. Add Error Handling and Logging
- Implement structured error responses with correlation IDs
- Add error logging to `app_errors` table for all failure scenarios
- Include appropriate HTTP status codes for different error types
- Add request context logging for debugging