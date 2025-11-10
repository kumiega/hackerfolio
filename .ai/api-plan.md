# REST API Plan

## 1. Resources
- **user_profiles**: Authenticated users with unique `username` (subdomain) and profile metadata
  - DB: `user_profiles`
- **portfolios**: One portfolio per user with draft_data and published_data (JSONB)
  - DB: `portfolios`
  - Contains sections and components in JSONB structure
- **app_errors**: Centralized error/event intake for client and server
  - DB: `app_errors`
- **imports/github**: Utility endpoints to list repos and generate project cards
  - External: GitHub API; Materialized to JSONB sections/components
- **imports/linkedin**: Utility to generate portfolio structure from manual user input
  - External: OpenRouter AI; Materialized to JSONB sections/components
- **public**: Public, SSR-facing portfolio retrieval by `username`
  - DB: `portfolios.published_data`, `user_profiles`
- **preview**: Owner-only preview of draft portfolio
  - DB: `portfolios.draft_data`, `user_profiles`
- **system**: Health and version

Notes
- Relationships: 1:1 `user_profiles`→`portfolios`
- Sections and components stored as JSONB within `portfolios` table
- Indexes: `portfolios(user_id)`, GIN on `portfolios(draft_data)` and `portfolios(published_data)`, time/severity/source/user indexes on `app_errors`

## 2. Endpoints
Common conventions
- **Base path**: `/api/v1`
- **Auth**: Supabase JWT via `Authorization: Bearer <token>` unless otherwise noted
- **Response envelope**
  - Success: `{ "data": <payload>, "meta": { ...optional } }`
  - Error: `{ "error": { "code": string, "message": string, "details": object|null, "requestId": string } }`
- **Pagination**: `page` (default 1), `per_page` (default 20, max 100) → `meta: { page, per_page, total, total_pages }`
- **Sorting**: `sort` (field), `order` (asc|desc), default resource-specific
- **Idempotency**: endpoints that cause side effects accept `Idempotency-Key`

### 2.1 Auth / Session
1) POST `/api/v1/auth/signin`
- Description: Provides sign-in using GitHub oAuth2 autorization
- Body: <empty>
- Response: 302 redirects to GitHub login page
- Errors: 500 internal server error

2) POST `/api/v1/auth/signout`
- Description: Sign out current user
- Body: <empty>
- Response: 302 redirects to app login page
- Errors: 401 unauthorized

3) POST `/api/v1/auth/callback`
- Description: Handles Supabase autorization response
- Query: `code` (required) provided by Supabase
- Response 302
```json
{ "data": { "available": true } }
```
- Errors: 401 unauthorized

### 2.2 Profiles
2) GET `/api/v1/profiles/username-availability`
- Description: Check username availability in real-time
- Query: `username` (required)
- Response 200
```json
{ "data": { "available": true } }
```
- Errors: 400 invalid format

3) POST `/api/v1/profiles/claim-username`
- Description: One-time set `username` for current user (cannot change later)
- Body
```json
{ "username": "^[a-z0-9-]{3,30}$" }
```
- Response 200
```json
{ "data": { "id": "uuid", "username": "string" } }
```
- Errors: 400 invalid, 409 taken, 409 already_set

Notes: Authentication flows (GitHub OAuth, email/password) are handled by Supabase client; server exposes session helpers only.

### 2.3 Portfolios
1) GET `/api/v1/portfolios/me`
- Description: Fetch portfolio (with draft_data) owned by current user
- Response 200
```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "draft_data": {
      "full_name": "string",
      "position": "string",
      "bio": [
        {
          "id": "uuid",
          "type": "text|image|social_links",
          "data": {}
        }
      ],
      "avatar_url": "string|null",
      "sections": [
        {
          "id": "uuid",
          "title": "string",
          "slug": "string",
          "description": "string",
          "visible": true,
          "components": [
            {
              "id": "uuid",
              "type": "text|card|pills|social_links|list|image|bio",
              "data": {}
            }
          ]
        }
      ]
    },
    "published_data": null,
    "created_at": "iso",
    "updated_at": "iso",
    "last_published_at": null
  }
}
```
- Errors: 404 if not created yet

2) POST `/api/v1/portfolios`
- Description: Create portfolio for current user (enforces 1:1)
- Body
```json
{
  "draft_data": {
    "full_name": "",
    "position": "",
    "bio": [],
    "avatar_url": null,
    "sections": []
  }
}
```
- Response 201 with portfolio object (as above)
- Errors: 409 if portfolio already exists; 422 validation

3) PATCH `/api/v1/portfolios/:id`
- Description: Update draft_data (sections and components)
- Body
```json
{
  "draft_data": {
    "full_name": "John Doe",
    "position": "Software Engineer",
    "bio": [...],
    "avatar_url": "https://...",
    "sections": [...]
  }
}
```
- Response 200 portfolio
- Errors: 403 not owner, 422 validation, 409 if exceeds limits (10 sections, 15 components total including bio)

4) POST `/api/v1/portfolios/:id/publish`
- Description: Publish portfolio by copying draft_data → published_data (validates ≥1 section and ≥1 component total in sections or bio)
- Response 200
```json
{
  "data": {
    "id": "uuid",
    "published_data": {...},
    "last_published_at": "iso"
  }
}
```
- Errors: 409 unmet_requirements (validation failed), 403 not owner

### 2.4 Component Types
Supported component types: `text`, `card`, `pills`, `social_links`, `list`, `image`, `bio`

Type-specific data structures:
- `text`: `{ "content": "string (max 2000 chars)" }`
- `card`: `{ "repo_url": "string", "title": "string (max 100)", "summary": "string (max 500)", "tech": ["string"] }`
- `pills`: `{ "items": ["string (max 30 items, 20 chars each)"] }`
- `social_links`: `{ "github": "url", "linkedin": "url", "x": "url", "website": [{ "name": "string", "url": "string" }] }`
- `list`: `{ "items": [{ "label": "string (max 80)", "url": "string" }] }`
- `image`: `{ "url": "string", "alt": "string (max 120)", "maxSizeMB": 2 }`
- `bio`: `{ "headline": "string (max 120)", "about": "string (max 2000)" }`

Note: Sections and components are managed via `PATCH /api/v1/portfolios/:id` by updating the entire `draft_data` JSONB object. Client-side handles all CRUD operations and sends the complete updated structure.

### 2.5 Imports — GitHub
1) GET `/api/v1/imports/github/repos`
- Description: List authenticated user repos (via GitHub OAuth access token)
- Query: `visibility` (all|public|private), `q`, `page`, `per_page`
- Response 200
```json
{
  "data": [
    {
      "id": 1,
      "name": "repo",
      "full_name": "u/repo",
      "stargazers_count": 10,
      "html_url": "url",
      "description": "string"
    }
  ],
  "meta": { "page": 1, "per_page": 50 }
}
```
- Errors: 401 if missing token

2) POST `/api/v1/imports/github/cards`
- Description: Generate card components for selected repos by reading README and detecting tech stack; returns components to be added to draft_data
- Body
```json
{
  "repo_urls": ["https://github.com/user/repo"],
  "limit": 10
}
```
- Response 200
```json
{
  "data": {
    "components": [
      {
        "id": "uuid",
        "type": "card",
        "data": {
          "repo_url": "string",
          "title": "string",
          "summary": "string",
          "tech": ["string"]
        }
      }
    ]
  }
}
```
- Errors: 422 validation, 429 rate_limited

Note: Client receives generated components and adds them to a section in draft_data, then calls PATCH `/api/v1/portfolios/:id`

### 2.6 Imports — LinkedIn
POST `/api/v1/imports/linkedin/profile`
- Description: Generate portfolio structure from manually entered LinkedIn data using AI
- Body
```json
{
  "name": "string",
  "headline": "string",
  "about": "string",
  "experience": [
    {
      "title": "string",
      "company": "string",
      "start_date": "string",
      "end_date": "string|null",
      "description": "string"
    }
  ],
  "education": [
    {
      "school": "string",
      "degree": "string",
      "field": "string",
      "start_date": "string",
      "end_date": "string"
    }
  ],
  "skills": ["string"]
}
```
- Response 200
```json
{
  "data": {
    "sections": [
      {
        "id": "uuid",
        "title": "About",
        "slug": "about",
        "description": "Introduction section",
        "visible": true,
        "components": [
          {
            "id": "uuid",
            "type": "bio",
            "data": {
              "headline": "string",
              "about": "string"
            }
          }
        ]
      }
    ]
  }
}
```
- Errors: 422 validation, 429 model_rate_limited

Note: Client receives generated sections and merges them into draft_data, then calls PATCH `/api/v1/portfolios/:id`

### 2.7 Public Portfolio (SSR)
GET `/api/v1/public/portfolios/:username`
- Description: Server-side endpoint for SSR rendering of published portfolios
- Query: none
- Auth: Service role (server-side only, bypasses RLS)
- Response 200
```json
{
  "data": {
    "username": "string",
    "published_data": {
      "sections": [
        {
          "id": "uuid",
          "title": "string",
          "slug": "string",
          "description": "string",
          "visible": true,
          "components": [
            {
              "id": "uuid",
              "type": "text|card|pills|social_links|list|image|bio",
              "data": {}
            }
          ]
        }
      ]
    },
    "last_published_at": "iso"
  }
}
```
- Errors: 401 unauthorized (invalid service key), 404 not_found, 403 if not published (published_data is NULL)

### 2.8 Preview Portfolio (Draft)
GET `/api/v1/preview/portfolios/:username`
- Description: Server-side endpoint for SSR rendering of draft portfolios (owner-only)
- Query: none
- Auth: Supabase JWT (must be portfolio owner)
- Response 200
```json
{
  "data": {
    "username": "string",
    "draft_data": {
      "sections": [...]
    },
    "updated_at": "iso"
  }
}
```
- Errors: 401 unauthorized, 403 not_owner, 404 not_found

### 2.9 Error Intake
POST `/api/v1/errors`
- Description: Insert-only logging intake for authenticated clients and server subsystems (mirrors `public.log_app_error` RPC).
- Body
```json
{
  "severity": "debug|info|warn|error|fatal",
  "source": "frontend|api|edge|worker|db|other",
  "message": "string",
  "error_code": "string|null",
  "route": "string|null",
  "endpoint": "string|null",
  "request_id": "string|null",
  "session_id": "string|null",
  "stack": "string|null",
  "context": {},
  "portfolio_id": "uuid|null"
}
```
- Response 202 `{ "data": { "accepted": true } }`
- Errors: 401 unauthorized, 413 payload_too_large, 422 validation

(Admin/service-only management of errors — list/query/cleanup — should be internal using service role and not exposed publicly in MVP.)

### 2.10 System
- GET `/api/v1/health` → `{ "data": { "status": "ok", "time": "iso" } }`
- GET `/api/v1/version` → `{ "data": { "version": "semver", "commit": "sha" } }`

## 3. Authentication and Authorization
- Mechanism: Supabase Auth (GitHub OAuth, email/password)
  - Clients authenticate directly with Supabase to obtain a JWT
  - API validates JWT via Supabase middleware
  - RLS policies enforce data access at database level
- Authorization model
  - Ownership enforced via RLS:
    - `portfolios`: `user_id = auth.uid()` for SELECT/INSERT/UPDATE/DELETE
    - `user_profiles`: `id = auth.uid()` for SELECT/UPDATE
  - `app_errors`: insert allowed for anon and authenticated; no read/update/delete via RLS
  - Public portfolios: SSR endpoints use service role to bypass RLS and read `published_data`
  - Preview portfolios: middleware validates `user_id = auth.uid()` before serving `draft_data`
- Token transport: `Authorization: Bearer <supabase_jwt>`
- Session: Handled by Astro middleware, injects `locals.user` with profile data
- Service role usage: SSR endpoints for published portfolios, background jobs (cleanup utilities)

## 4. Validation and Business Logic
Validation (API layer using Zod schemas)
- `portfolios`
  - `draft_data`: must be valid JSONB with `sections` array
  - Max 10 sections in `draft_data.sections`
  - Max 15 components total across all sections in `draft_data`
  - Uniqueness: one portfolio per `user_id`; return 409 if exists
- `sections` (within draft_data)
  - `title`: required, ≤150 chars
  - `slug`: auto-generated from title, lowercase, hyphenated
  - `visible`: boolean
  - Each section has `components` array
- `components` (within sections)
  - `type`: must be one of: `text`, `card`, `pills`, `social_links`, `list`, `image`, `bio`
  - `data`: type-specific validation (see 2.4)
  - Content limits: short texts ≤500, long texts ≤2000, images ≤2MB
- `app_errors`
  - `severity`: `debug|info|warn|error|fatal`
  - `source`: `frontend|api|edge|worker|db|other`
  - `message`: required
  - `context`: JSONB; truncate if exceeding limits
- `user_profiles`
  - `username`: regex `^[a-z0-9-]{3,30}$`, lowercase, unique; immutable once set

Business logic
- **Publish rules**: 
  - Validate `draft_data` has ≥1 section and ≥1 component total
  - Copy `draft_data` → `published_data`
  - Set `last_published_at = now()`
- **Limits**: Enforce 10 sections and 15 components caps on PATCH with 409 response
- **Draft/Publish workflow**:
  - All edits update `draft_data` only
  - Publishing snapshots current `draft_data` to `published_data`
  - No history tracking (MVP simplification)
- **Importers**:
  - GitHub: Fetch repo README and metadata; extract tech stack; generate card components; return to client for merging into draft_data
  - LinkedIn: AI (OpenRouter) generates sections and components from manual user input; return to client for merging into draft_data
  - Client handles all merging and calls PATCH to update draft_data
- **Error intake**: Non-blocking; respond 202 and persist asynchronously; attach `client_ip` and `user_agent` server-side

Security and resilience
- Rate limiting: default 60 req/min/IP; stricter for `/imports/*` (10 req/min) and `/errors` (200 req/min)
- CORS: allow app origins only
- Request IDs: accept `X-Request-Id` or generate UUID; echo in error payloads
- Idempotency: support `Idempotency-Key` for publish and import actions
- Input sanitization: Zod validation; HTML/URL validation; restrict image sizes; reject unknown fields
- Logging: structured logs with `user_id`, `route`, `request_id`

Performance considerations
- GIN indexes on `draft_data` and `published_data` for JSONB queries
- Cache published portfolios (by username) with short TTL for SSR
- Service role bypasses RLS for public portfolio reads (faster than RLS policies)

## 5. Example Error Codes
- `validation_failed` (422)
- `not_authenticated` (401)
- `forbidden` (403)
- `not_found` (404)
- `already_exists` (409)
- `username_taken` (409)
- `username_already_set` (409)
- `section_limit_reached` (409)
- `component_limit_reached` (409)
- `cannot_delete_last_required` (409)
- `unmet_requirements` (409)
- `rate_limited` (429)
- `internal_error` (500)

## 6. Data Models (Response Shapes)
Summarized types for reference; actual responses follow examples above.

- Portfolio
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "draft_data": {
    "sections": []
  },
  "published_data": null,
  "created_at": "iso",
  "updated_at": "iso",
  "last_published_at": "iso|null"
}
```

- Section (within draft_data/published_data)
```json
{
  "id": "uuid",
  "title": "string",
  "slug": "string",
  "description": "string",
  "visible": true,
  "components": []
}
```

- Component (within section.components)
```json
{
  "id": "uuid",
  "type": "text|card|pills|social_links|list|image|bio",
  "data": {}
}
```

- Public Portfolio Payload
```json
{
  "username": "string",
  "published_data": {
    "sections": [...]
  },
  "last_published_at": "iso"
}
```

- Preview Portfolio Payload
```json
{
  "username": "string",
  "draft_data": {
    "sections": [...]
  },
  "updated_at": "iso"
}
```

- Error
```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {},
    "requestId": "string"
  }
}
```

## 7. Compatibility with Tech Stack
- Astro 5 + React 19: Public/preview endpoints optimized for SSR; dashboard endpoints return JSON for React islands. Place handlers under `src/pages/api/v1/*`.
- TypeScript 5: Define shared DTOs in `src/types.ts` aligning with JSONB structure (Portfolio, Section, Component types with Zod schemas).
- Tailwind 4 + shadcn/ui: No API impact; dashboard UI handles all section/component CRUD client-side, then PATCHes draft_data.
- Supabase: Use RLS policies for authenticated access; service role for public SSR endpoints; JSONB columns for portfolio data.
- OpenRouter: Server-side integration with rate-limited calls for LinkedIn data generation.
- GitHub: OAuth token supplied by client; server fetches repos and generates cards; respects GitHub API pagination.

## 8. Non-Functional Requirements
- Observability: traces for importer and publish actions; structured logs
- Backoff and retries for external API calls (GitHub, OpenRouter)
- Strict timeouts: 10s for standard endpoints, 20s for importers
- Payload limits: 1 MB JSON for draft_data; images ≤2MB
- Internationalization: content stored as UTF-8; API messages in English

## 9. Implementation Status

### ✅ Implemented Endpoints
- [x] POST /api/v1/auth/signin
- [x] POST /api/v1/auth/signout
- [x] GET /api/v1/auth/callback
- [x] GET /api/v1/profiles/username-availability
- [x] POST /api/v1/profiles/claim-username
- [x] GET /api/v1/portfolios/me (returns draft_data and published_data)
- [x] POST /api/v1/portfolios (creates portfolio with empty draft_data)
- [x] PATCH /api/v1/portfolios/:id (updates full draft_data JSONB with validation)
- [x] POST /api/v1/portfolios/:id/publish (copies draft_data → published_data via DB function)
- [x] GET /api/v1/imports/github/repos
- [x] POST /api/v1/imports/github/cards (returns component data for client-side merge)
- [x] POST /api/v1/imports/linkedin/profile (accepts manual data, returns generated sections)
- [x] GET /api/v1/public/portfolios/:username (SSR endpoint for published_data)
- [x] GET /api/v1/preview/portfolios/:username (owner-only draft preview)
- [x] POST /api/v1/errors
- [x] GET /api/v1/health
- [x] GET /api/v1/version

### ❌ Removed Endpoints (No Longer Needed)
- All `/api/v1/sections/*` endpoints (CRUD operations)
- All `/api/v1/components/*` endpoints (CRUD operations)
- POST `/api/v1/portfolios/:id/unpublish` (not needed for MVP)
- All `/api/v1/ssr/*` endpoints (replaced by public/preview endpoints)

**Note**: Section and component management is now handled entirely client-side. Clients update the complete `draft_data` structure via `PATCH /api/v1/portfolios/:id`.