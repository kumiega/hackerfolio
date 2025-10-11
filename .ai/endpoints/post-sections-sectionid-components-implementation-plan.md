# API Endpoint Implementation Plan: POST /api/v1/sections/:sectionId/components

## 1. Endpoint Overview
This endpoint creates a new component within a specific section. It enforces a global portfolio-level limit of 15 components total across all sections, ensuring portfolio size remains manageable. The endpoint supports 8 different component types with type-specific data validation requirements.

## 2. Request Details
- **HTTP Method**: POST
- **URL Structure**: `/api/v1/sections/:sectionId/components`
- **Authentication**: Required (GitHub OAuth via Supabase Auth)
- **Parameters**:
  - **Required**:
    - `sectionId` (path parameter): UUID of the target section
    - `type` (body): Component type enum
    - `data` (body): Type-specific component data object
  - **Optional**: None
- **Request Body Structure**:
  ```json
  {
    "type": "text|project_card|tech_list|social_links|link_list|gallery|bio|ordered_list",
    "data": {
      // Type-specific fields based on component type
    }
  }
  ```
- **Content-Type**: `application/json`

## 3. Used Types
- **Request Types**:
  - `CreateComponentCommand`: `{ type: ComponentType; data: ComponentData; }`
  - `ComponentData`: Union type with type-specific interfaces:
    - `TextComponentData`: `{ content: string }` (≤2000 chars)
    - `ProjectCardComponentData`: `{ repo_url: string; title: string; summary: string; tech: string[] }`
    - `TechListComponentData`: `{ items: string[] }` (≤30 items, each ≤20 chars)
    - `SocialLinksComponentData`: `{ github?: string; linkedin?: string; x?: string; website?: Array<{name: string; url: string}> }`
    - `LinkListComponentData`: `{ items: Array<{label: string; url: string}> }` (label ≤80 chars)
    - `GalleryComponentData`: `{ images: Array<{url: string; alt: string}>; maxImageSizeMB?: number }` (alt ≤120 chars)
    - `BioComponentData`: `{ headline: string; about: string }` (both ≤120/2000 chars)
    - `OrderedListComponentData`: `{ items: Array<{label: string; value?: string}> }` (label ≤80 chars)

- **Response Types**:
  - `ComponentDto`: `{ id: string; type: ComponentType; position: number; data: ComponentData; }`
  - `ApiSuccessResponse<ComponentDto>`: `{ data: ComponentDto; }`

## 4. Response Details
- **Success Response** (201 Created):
  ```json
  {
    "data": {
      "id": "uuid",
      "type": "component_type",
      "position": 0,
      "data": { /* component-specific data */ }
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: User not authenticated
  - `403 Forbidden`: User doesn't own the section (RLS violation)
  - `404 Not Found`: Section doesn't exist or access denied
  - `409 Conflict`: Component limit reached (portfolio-level: 15 components total)
  - `422 Unprocessable Entity`: Invalid input data or validation failed
  - `500 Internal Server Error`: Database or server errors

## 5. Data Flow
1. **Authentication Check**: Verify user session via Supabase Auth
2. **Parameter Validation**: Validate sectionId UUID format
3. **Request Body Parsing**: Parse and validate JSON body structure
4. **Type-Specific Validation**: Validate component data based on type
5. **Ownership Verification**: Ensure user owns the target section (via RLS)
6. **Limit Enforcement**: Check portfolio-level component count (≤15 total)
7. **Position Assignment**: Calculate next position within section
8. **Database Insertion**: Create component record with proper relationships
9. **Response Construction**: Return created component data

## 6. Security Considerations
- **Authentication**: Required via GitHub OAuth, enforced by middleware
- **Authorization**: Row Level Security (RLS) policies ensure users can only create components in sections they own
- **Input Validation**: Comprehensive validation prevents injection attacks and malformed data
- **Data Size Limits**: Component content limited (e.g., text ≤2000 chars) to prevent DoS
- **Rate Limiting**: Consider implementing to prevent abuse (portfolio creation limits)
- **Data Sanitization**: URL validation for external links, content length restrictions

## 7. Error Handling
- **Validation Errors (422)**: Invalid component type, missing required fields, data format violations
- **Limit Exceeded (409)**: Portfolio component limit reached (15 total components)
- **Not Found (404)**: Section doesn't exist or user lacks access
- **Database Errors (500)**: Connection issues, constraint violations
- **Authentication Errors (401/403)**: Session issues or ownership violations

All errors are logged to the `app_errors` table with context including user ID, section ID, request details, and error stack traces for debugging.

## 8. Performance Considerations
- **Database Queries**: Single query for component count check, efficient via Supabase
- **RLS Overhead**: Minimal impact as ownership checks are indexed
- **JSONB Storage**: Efficient for component data with GIN indexing available
- **Position Calculation**: Simple MAX() query for position assignment
- **Caching**: Consider caching component counts for frequent portfolio operations

## 9. Implementation Steps

### 9.1 Update ComponentService.createComponent() Method
**File**: `src/lib/services/component.service.ts`

**Changes Required**:
- Modify component limit check from section-level (15 per section) to portfolio-level (15 total)
- Update error message and logic to count components across all portfolio sections
- Ensure position assignment remains section-specific

**Implementation**:
```typescript
// Check portfolio-level component count instead of section-level
const { count: portfolioComponentCount, error: countError } = await supabase
  .from("components")
  .select("*", { count: "exact", head: true })
  .eq("section_id", sectionId); // This needs to be changed to portfolio level

// Change to:
const { data: sectionPortfolioId, error: portfolioError } = await supabase
  .from("sections")
  .select("portfolio_id")
  .eq("id", sectionId)
  .single();

const { count: portfolioComponentCount, error: countError } = await supabase
  .from("components")
  .select("*", { count: "exact", head: true })
  .in("section_id",
    supabase
      .from("sections")
      .select("id")
      .eq("portfolio_id", sectionPortfolioId.portfolio_id)
  );
```

### 9.2 Create Type-Specific Validation Schemas
**File**: `src/lib/schemas/component.schemas.ts`

**Add New Schemas**:
- `textComponentDataSchema`
- `projectCardComponentDataSchema`
- `techListComponentDataSchema`
- `socialLinksComponentDataSchema`
- `linkListComponentDataSchema`
- `galleryComponentDataSchema`
- `bioComponentDataSchema`
- `orderedListComponentDataSchema`

**Update createComponentCommandSchema**:
```typescript
export const createComponentCommandSchema = z.object({
  type: z.enum([
    "text", "project_card", "tech_list", "social_links",
    "link_list", "gallery", "bio", "ordered_list"
  ]),
  data: z.union([
    textComponentDataSchema,
    projectCardComponentDataSchema,
    techListComponentDataSchema,
    socialLinksComponentDataSchema,
    linkListComponentDataSchema,
    galleryComponentDataSchema,
    bioComponentDataSchema,
    orderedListComponentDataSchema,
  ]),
});
```

### 9.3 Implement POST Handler
**File**: `src/pages/api/v1/sections/[id]/components/index.ts`

**Add POST Export Function**:
```typescript
export const POST: APIRoute = async (context) => {
  // Implementation following existing GET pattern:
  // 1. Auth check
  // 2. Parameter validation
  // 3. Body parsing and validation
  // 4. Service call
  // 5. Response construction
  // 6. Error handling with proper logging
};
```

### 9.4 Update Error Constants (if needed)
**File**: `src/lib/error-constants.ts`

**Potential Addition**:
- `COMPONENT_PORTFOLIO_LIMIT_REACHED: "COMPONENT_PORTFOLIO_LIMIT_REACHED"`

**Update Error Mappings**:
```typescript
COMPONENT_PORTFOLIO_LIMIT_REACHED: {
  statusCode: 409,
  defaultMessage: "Maximum of 15 components allowed per portfolio",
  isUserError: true,
},
```

### 9.5 Testing Requirements
- Unit tests for type-specific validation schemas
- Integration tests for component creation with limits
- Error scenario testing (limits, validation, auth)
- Performance testing with multiple components

### 9.6 Documentation Updates
- Update API specification documentation
- Add component type examples
- Document portfolio-level limits clearly
- Update error response examples

## 10. Dependencies and Prerequisites
- Supabase client configuration
- Zod validation schemas
- Error handling infrastructure
- Authentication middleware
- Database RLS policies (already implemented)
- Component service methods (partially implemented)

## 11. Rollback Plan
- Database changes: No schema changes required, only logic updates
- Service changes: Revert ComponentService.createComponent() to section-level limits if needed
- API changes: Remove POST handler if issues arise
- Schema changes: Revert validation schemas to basic structure

## 12. Success Criteria
- POST endpoint accepts valid component creation requests
- Portfolio-level limit of 15 components enforced correctly
- Type-specific validation works for all 8 component types
- Proper error responses for all failure scenarios
- Components created with correct positioning within sections
- RLS security policies prevent unauthorized access
- Error logging captures all issues for debugging
