# API Endpoint Implementation Plan: LinkedIn Profile Parse

## 1. Endpoint Overview

The `POST /api/v1/imports/linkedin/parse` endpoint enables users to parse LinkedIn profile URLs using AI to extract structured data. The endpoint accepts a LinkedIn profile URL, processes it through an AI service (OpenRouter), and returns structured profile information. Optionally, it can create portfolio components directly in a specified section if the user chooses to do so.

The endpoint integrates with:
- OpenRouter AI service for profile parsing
- Supabase for authentication and database operations
- Component creation service for optional portfolio updates

## 2. Request Details

- **HTTP Method**: POST
- **URL Structure**: `/api/v1/imports/linkedin/parse`
- **Authentication**: Required (Supabase Auth session)
- **Content-Type**: application/json

### Parameters

**Required:**
- `url` (string): Valid LinkedIn profile URL (e.g., "https://www.linkedin.com/in/username")

**Optional:**
- `create_components` (boolean): Whether to create portfolio components from parsed data (default: false)
- `section_id` (string, UUID): Required when `create_components` is true - target section for component creation

### Request Body Schema
```json
{
  "url": "https://www.linkedin.com/in/johndoe",
  "create_components": true,
  "section_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## 3. Used Types

### Command Models
- `LinkedInParseCommand`: Request validation interface
  ```typescript
  interface LinkedInParseCommand {
    url: string;
    create_components?: boolean;
    section_id?: string;
  }
  ```

### Response DTOs
- `LinkedInParseResultDto`: Complete response structure
- `LinkedInProfile`: Parsed profile data structure
- `ComponentDto[]`: Array of created components (when applicable)

## 4. Data Flow

1. **Authentication & Authorization**
   - Extract user session from Supabase auth
   - Validate user has active session

2. **Request Validation**
   - Parse JSON request body
   - Validate LinkedIn URL format and accessibility
   - Conditionally validate section_id when create_components=true
   - Verify user owns target section (if component creation requested)

3. **AI Processing**
   - Call OpenRouter service with LinkedIn profile URL
   - Parse AI response into structured LinkedInProfile format
   - Handle rate limiting and service errors

4. **Optional Component Creation**
   - If create_components=true, create bio component from profile data
   - Validate portfolio component limits (max 15 per portfolio)
   - Return created component details

5. **Response Construction**
   - Package profile data and component results
   - Return structured JSON response

## 5. Security Considerations

### Authentication & Authorization
- **Session Validation**: Require valid Supabase auth session for all requests
- **Section Ownership**: Verify user owns target section before component creation
- **Portfolio Limits**: Enforce maximum 15 components per portfolio

### Input Validation & Sanitization
- **URL Validation**: Strict LinkedIn URL pattern matching to prevent malicious URLs
- **Schema Validation**: Use Zod schemas for request body validation
- **AI Response Sanitization**: Validate and sanitize AI service responses

### Rate Limiting & Abuse Prevention
- **AI Service Limits**: Implement rate limiting for OpenRouter API calls
- **Request Throttling**: Prevent excessive requests per user/time period
- **Error Response Consistency**: Avoid exposing internal error details

### Data Protection
- **Profile Data Handling**: Securely process and store only necessary profile information
- **Error Logging**: Log errors without exposing sensitive user data
- **AI Prompt Security**: Use structured prompts to prevent injection attacks

## 6. Error Handling

### HTTP Status Codes & Error Scenarios

**400 Bad Request**
- Invalid JSON in request body
- Missing required `url` parameter
- Malformed request structure

**401 Unauthorized**
- No valid authentication session
- User session expired

**404 Not Found**
- Target section doesn't exist
- Section not owned by authenticated user

**422 Unprocessable Entity**
- Invalid LinkedIn URL format
- LinkedIn profile not accessible or doesn't exist
- AI parsing failed to extract valid profile data
- Missing `section_id` when `create_components=true`

**429 Too Many Requests**
- AI service rate limit exceeded
- User request rate limit exceeded

**500 Internal Server Error**
- Database connection errors
- AI service unavailable
- Unexpected server errors

### Error Logging Strategy
- **Database Logging**: All errors logged to `app_errors` table with appropriate severity
- **Context Capture**: Include request_id, user_id, endpoint, and relevant error context
- **Rate Limit Tracking**: Special handling for rate limiting errors
- **Security Events**: Log potential security violations (URL injection attempts)

## 7. Performance Considerations

### Response Time Optimization
- **AI Service Caching**: Consider caching frequently accessed profiles (if privacy allows)
- **Concurrent Processing**: Process component creation asynchronously when possible
- **Timeout Handling**: Implement reasonable timeouts for AI service calls (30s max)

### Resource Management
- **Memory Usage**: Stream AI responses to prevent memory exhaustion
- **Database Connections**: Use connection pooling and proper cleanup
- **Rate Limiting**: Implement distributed rate limiting for multi-instance deployments

### Scalability Factors
- **Stateless Design**: Ensure endpoint can scale horizontally
- **External Service Dependencies**: Monitor OpenRouter service health
- **Database Load**: Optimize queries for section/component ownership validation

## 8. Implementation Steps

### Phase 1: Core Infrastructure
1. Create `src/lib/services/linkedin.service.ts` with basic structure
2. Implement LinkedIn URL validation utilities
3. Set up OpenRouter API integration
4. Create Zod validation schemas for request/response

### Phase 2: Endpoint Implementation
5. Create `src/pages/api/v1/imports/linkedin/parse.ts` endpoint file
6. Implement authentication and basic request handling
7. Add input validation and error handling structure
8. Integrate LinkedIn service for AI parsing

### Phase 3: Component Creation Logic
9. Add section ownership verification
10. Implement component creation flow (bio component from profile)
11. Add portfolio component limit validation
12. Integrate with existing ComponentService

### Phase 4: Error Handling & Security
13. Implement comprehensive error logging
14. Add rate limiting and abuse prevention
15. Security hardening (URL validation, input sanitization)
16. Performance optimization and monitoring

### Phase 5: Testing & Documentation
17. Unit tests for LinkedIn service functions
18. Integration tests for endpoint functionality
19. Error scenario testing and validation
20. API documentation updates and examples