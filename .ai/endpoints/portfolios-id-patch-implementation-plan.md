# API Endpoint Implementation Plan: PATCH `/api/v1/portfolios/:id`

## 1. Endpoint Overview

This endpoint allows authenticated users to update the mutable fields (title and description) of their existing portfolio. The endpoint enforces strict ownership verification to ensure users can only modify their own portfolios.

**Key Requirements:**
- User authentication required
- Portfolio ownership verification
- Input validation for title and description
- Comprehensive error handling and logging
- Returns updated portfolio data on success

## 2. Request Details

- **HTTP Method**: PATCH
- **URL Structure**: `/api/v1/portfolios/:id`
  - `:id` - Portfolio UUID (required URL parameter)
- **Authentication**: Required (Supabase JWT token)
- **Parameters**:
  - **Required**: `id` (URL parameter) - Portfolio UUID
  - **Request Body**:
    - `title` (required): string, 1-100 characters, trimmed
    - `description` (optional): string or null
- **Content-Type**: `application/json`

## 3. Response Details

### Success Response (200)
```json
{
  "data": {
    "id": "portfolio-uuid",
    "user_id": "user-uuid",
    "is_published": false,
    "published_at": null,
    "title": "Updated Portfolio Title",
    "description": "Updated description",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "requestId": "request-uuid"
  }
}
```

#### 404 Not Found
```json
{
  "error": {
    "code": "PORTFOLIO_NOT_FOUND",
    "message": "Portfolio not found or access denied",
    "requestId": "request-uuid"
  }
}
```

#### 422 Validation Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "title": {
        "_errors": ["String must contain at least 1 character(s)"]
      }
    },
    "requestId": "request-uuid"
  }
}
```

#### 500 Internal Server Error
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Database error occurred",
    "requestId": "request-uuid"
  }
}
```

## 4. Data Flow

1. **Authentication Check**: Verify user is authenticated via Supabase
2. **Parameter Validation**: Validate portfolio ID from URL parameters
3. **Request Body Parsing**: Parse JSON request body with error handling
4. **Input Validation**: Validate title and description using Zod schema
5. **Ownership Verification**: Check portfolio exists and belongs to authenticated user
6. **Database Update**: Update portfolio record with new data
7. **Response**: Return updated portfolio data

## 5. Security Considerations

### Authentication & Authorization
- **JWT Verification**: Uses Supabase `getUser()` to verify JWT token integrity
- **Profile Verification**: Ensures user profile exists in database
- **Ownership Verification**: Double-check via RLS policy + explicit user_id filter
- **RLS Policies**: Database-level row security prevents unauthorized access

### Input Validation
- **JSON Parsing**: Safe JSON parsing with try-catch for malformed requests
- **Schema Validation**: Zod schema enforces field types and constraints
- **Sanitization**: String trimming prevents whitespace-only titles
- **Length Limits**: Database-level constraints prevent oversized data

### Data Protection
- **No Data Exposure**: Only portfolio owner can update their portfolio
- **Secure Updates**: Uses parameterized queries to prevent SQL injection
- **Audit Trail**: All changes logged with user context

## 6. Error Handling

### Error Scenarios & Responses

| Scenario | HTTP Status | Error Code | Handling Strategy |
|----------|-------------|------------|-------------------|
| No authentication | 401 | UNAUTHORIZED | Return auth required message |
| Profile not found | 401 | UNAUTHORIZED | Return profile not found message |
| Invalid portfolio ID | 422 | VALIDATION_ERROR | Validate UUID format |
| Malformed JSON | 422 | VALIDATION_ERROR | Safe JSON parsing |
| Invalid title/description | 422 | VALIDATION_ERROR | Zod schema validation |
| Portfolio not found | 404 | PORTFOLIO_NOT_FOUND | Check existence + ownership |
| Not portfolio owner | 404 | PORTFOLIO_NOT_FOUND | Ownership verification |
| Database connection error | 500 | INTERNAL_ERROR | Log and return generic error |
| Database constraint violation | 500 | INTERNAL_ERROR | Log detailed error |
| Unexpected error | 500 | INTERNAL_ERROR | Log with full context |

### Error Logging Strategy
- **Database Errors**: Logged with "error" severity, includes user_id and portfolio_id
- **Validation Errors**: Logged with "warn" severity for monitoring
- **Auth Errors**: Logged with "warn" severity
- **Unexpected Errors**: Logged with "error" severity, includes full stack trace

## 7. Performance Considerations

### Database Optimization
- **Indexed Queries**: Leverages existing B-tree indexes on `portfolios(user_id)`
- **Single Row Updates**: Uses targeted UPDATE with WHERE conditions
- **RLS Efficiency**: Row-level security adds minimal overhead for authorized users

### Response Optimization
- **Selective Fields**: Returns only necessary portfolio fields
- **JSON Serialization**: Efficient response formatting
- **Early Returns**: Error conditions return immediately without additional processing

### Monitoring & Scalability
- **Request Tracking**: Unique request IDs for tracing
- **Error Aggregation**: Structured error logging for analysis
- **Resource Cleanup**: No resource leaks in error paths

## 8. Implementation Steps

### 1. Service Layer Enhancement
- [x] Add `UpdatePortfolioCommand` import to PortfolioService
- [x] Implement `updatePortfolio` method with ownership verification
- [x] Add proper error handling and database error translation

### 2. Endpoint Implementation
- [x] Create `src/pages/api/v1/portfolios/[id].ts` file
- [x] Implement PATCH handler following Astro APIRoute pattern
- [x] Add prerender = false directive

### 3. Input Validation
- [x] Define Zod schema for title (required, trimmed, 1-100 chars) and description (optional, nullable)
- [x] Implement safe JSON parsing with error handling
- [x] Add portfolio ID parameter validation

### 4. Authentication & Authorization
- [x] Integrate AuthService.getCurrentSession() for authentication
- [x] Implement ownership verification in service layer
- [x] Leverage existing RLS policies for additional security

### 5. Error Handling & Logging
- [x] Implement comprehensive error catch blocks for all scenarios
- [x] Add structured error responses with request IDs
- [x] Integrate error logging utility for database and unexpected errors
- [x] Include relevant context (user_id, portfolio_id) in error logs

### 6. Testing & Validation
- [ ] Test authentication scenarios (401 responses)
- [ ] Test authorization scenarios (404 for non-owned portfolios)
- [ ] Test input validation (422 responses for invalid data)
- [ ] Test successful updates (200 responses)
- [ ] Test error logging functionality
- [ ] Test database error scenarios (500 responses)

## 9. Dependencies & Imports

### Type Imports
```typescript
import type {
  APIRoute,
  ApiSuccessResponse,
  ApiErrorResponse,
  PortfolioDto,
  UpdatePortfolioCommand
} from "@/types";
```

### Service Imports
```typescript
import { z } from "zod";
import { PortfolioService } from "@/lib/services/portfolio.service";
import { AuthService } from "@/lib/services/auth.service";
import { logError } from "@/lib/error-utils";
```

## 10. Code Quality Considerations

### Clean Code Practices
- **Early Returns**: Error conditions return immediately
- **Guard Clauses**: Input validation before business logic
- **Single Responsibility**: Service layer handles data operations
- **Error Transparency**: Clear error messages without sensitive data

### Maintainability
- **Consistent Patterns**: Follows existing endpoint patterns
- **Documentation**: Comprehensive JSDoc comments
- **Type Safety**: Full TypeScript coverage with proper types
- **Modular Design**: Separates concerns between endpoint and service layers

## 11. Future Enhancements

### Potential Improvements
- **Partial Updates**: Support PATCH semantics for individual field updates
- **Optimistic Locking**: Add version fields for concurrent update handling
- **Audit Trail**: Enhanced logging for change history
- **Rate Limiting**: Add request throttling for update operations
- **Caching**: Implement cache invalidation for portfolio data
