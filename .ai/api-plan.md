# REST API Plan

## 1. Resources
- **user_profiles**: Authenticated users with unique `username` (subdomain) and profile metadata
  - DB: `user_profiles`
- **portfolios**: One portfolio per user containing sections and components
  - DB: `portfolios`
- **sections**: Ordered containers within a portfolio
  - DB: `sections`
- **components**: Typed content blocks within a section
  - DB: `components`
- **app_errors**: Centralized error/event intake for client and server
  - DB: `app_errors`
- **imports/github**: Utility endpoints to list repos and generate project cards
  - External: GitHub API; Materialized to `components(data)`
- **imports/linkedin**: Utility to parse LinkedIn profile via AI
  - External: OpenRouter AI; Materialized to `components(data)`
- **public**: Public, SSR-facing portfolio retrieval by `username`
  - DB: `portfolios`, `sections`, `components`, `user_profiles`
- **system**: Health and version

Notes
- Relationships: 1:1 `user_profiles`→`portfolios`; 1:* `portfolios`→`sections`; 1:* `sections`→`components`.
- Indexes used by list endpoints and filters: `portfolios(user_id)`, `sections(portfolio_id, position)`, `components(section_id, position)`, GIN on `components(data)`, and time/severity/source/user indexes on `app_errors`.

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
1) GET `/api/v1/auth/session`
- Description: Returns current authenticated user and profile
- Query: none
- Response 200
```json
{
  "data": {
    "user": { "id": "uuid", "email": "string" },
    "profile": { "id": "uuid", "username": "string|null", "created_at": "iso" }
  }
}
```
- Errors: 401 unauthenticated

2) GET `/api/v1/auth/username-availability`
- Description: Check username availability in real-time
- Query: `username` (required)
- Response 200
```json
{ "data": { "available": true } }
```
- Errors: 400 invalid format

3) POST `/api/v1/auth/claim-username`
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

### 2.2 Portfolios
1) GET `/api/v1/portfolios/me`
- Description: Fetch portfolio owned by current user
- Response 200
```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "is_published": false,
    "published_at": null,
    "title": "string",
    "description": "string|null",
    "created_at": "iso"
  }
}
```
- Errors: 404 if not created yet

2) POST `/api/v1/portfolios`
- Description: Create portfolio for current user (enforces 1:1)
- Body
```json
{
  "title": "max 100 chars",
  "description": "string|null"
}
```
- Response 201 with portfolio object (as above)
- Errors: 409 if portfolio already exists; 422 validation

3) PATCH `/api/v1/portfolios/:id`
- Description: Update mutable fields
- Body
```json
{ "title": "string", "description": "string|null" }
```
- Response 200 portfolio
- Errors: 403 not owner, 422 validation

4) POST `/api/v1/portfolios/:id/publish`
- Description: Publish portfolio if it has ≥1 section and ≥1 component total
- Response 200
```json
{ "data": { "is_published": true, "published_at": "iso" } }
```
- Errors: 409 unmet_requirements, 403 not owner

5) POST `/api/v1/portfolios/:id/unpublish`
- Description: Unpublish
- Response 200 `{ "data": { "is_published": false, "published_at": null } }`
- Errors: 403 not owner

### 2.3 Sections
1) GET `/api/v1/portfolios/:portfolioId/sections`
- Description: List sections for a portfolio with ordering
- Query: `page`, `per_page`, `sort` in {"position","name","created_at"}, `order`
- Response 200
```json
{
  "data": [
    { "id": "uuid", "name": "string", "position": 1, "visible": true }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 3, "total_pages": 1 }
}
```

2) POST `/api/v1/portfolios/:portfolioId/sections`
- Description: Create section (max 10 per portfolio)
- Body
```json
{ "name": "max 150 chars", "visible": true }
```
- Response 201 section
- Errors: 409 section_limit_reached, 422 validation

3) PATCH `/api/v1/sections/:id`
- Description: Update name/visibility
- Body
```json
{ "name": "string", "visible": true }
```
- Response 200 section

4) POST `/api/v1/sections/:id/reorder`
- Description: Change section order via new `position`
- Body
```json
{ "position": 1 }
```
- Response 200 section

5) DELETE `/api/v1/sections/:id`
- Description: Delete section (cannot delete last section before publish if it breaks min requirement)
- Response 204
- Errors: 409 cannot_delete_last_required

### 2.4 Components
Component types (enum): `text`, `project_card`, `tech_list`, `social_links`, `list`, `gallery`, `bio`.

1) GET `/api/v1/sections/:sectionId/components`
- Description: List components within a section ordered by `position`
- Query: `page`, `per_page`, `sort` in {"position","created_at"}, `order`, `type`, `q` (lightweight search within `data` via GIN where applicable)
- Response 200 array of components

2) POST `/api/v1/sections/:sectionId/components`
- Description: Create a component (global portfolio cap: 15 components total)
- Body (generic)
```json
{ "type": "component_type", "data": { "...type-specific..." } }
```
- Type-specific `data` guidance
  - `text`: { "content": "<=2000" }
  - `project_card`: { "repo_url": "string", "title": "<=100", "summary": "<=500", "tech": ["string"] }
  - `tech_list`: { "items": ["<=30 items", "<=20 chars each"] }
  - `social_links`: { "github": "url?", "linkedin": "url?", "x": "url?", "website": [{ "name": "string", "url": "string" }] }
  - `list`: { "items": [{ "label": "<=80", "url": "string" }] }
  - `gallery`: { "images": [{ "url": "string", "alt": "<=120" }], "maxImageSizeMB": 2 }
  - `bio`: { "headline": "<=120", "about": "<=2000" }
- Response 201 component
- Errors: 409 component_limit_reached, 422 validation

3) PATCH `/api/v1/components/:id`
- Description: Update `data` or toggle visibility via the parent section if needed
- Body
```json
{ "data": { "...type-specific..." } }
```
- Response 200 component

4) POST `/api/v1/components/:id/reorder`
- Description: Update `position` within its section
- Body
```json
{ "position": 1 }
```
- Response 200 component

5) DELETE `/api/v1/components/:id`
- Description: Remove component
- Response 204

### 2.5 Imports — GitHub
1) GET `/api/v1/imports/github/repos`
- Description: List authenticated user repos (via GitHub OAuth access token stored client-side or exchanged server-side)
- Query: `visibility` (all|public|private), `q`, `page`, `per_page`
- Response 200
```json
{ "data": [{ "id": 1, "name": "repo", "full_name": "u/repo", "stargazers_count": 10, "html_url": "url" }], "meta": { "page": 1, "per_page": 50 } }
```
- Errors: 401 if missing token

2) POST `/api/v1/imports/github/generate-project-cards`
- Description: Generate `project_card` components for selected repos by reading README and tech; auto-insert to a chosen section
- Body
```json
{
  "section_id": "uuid",
  "repo_urls": ["https://github.com/user/repo"],
  "limit": 10
}
```
- Response 201
```json
{ "data": { "created": 3, "components": [ { "id": "uuid", "type": "project_card" } ] } }
```
- Errors: 409 component_limit_reached, 422 validation

### 2.6 Imports — LinkedIn
POST `/api/v1/imports/linkedin/parse`
- Description: Parse LinkedIn profile URL using AI, return structured JSON and optionally create components
- Body
```json
{ "url": "https://www.linkedin.com/in/...", "create_components": true, "section_id": "uuid|null" }
```
- Response 200
```json
{ "data": { "profile": { "name": "string", "headline": "string", "experience": [ { "title": "string", "company": "string" } ] }, "created_components": [ { "id": "uuid", "type": "bio" } ] } }
```
- Errors: 422 invalid url, 429 model_rate_limited

### 2.7 Public — SSR consumption
GET `/api/v1/public/portfolios/:username`
- Description: Public read model for SSR of a published portfolio
- Query: none
- Response 200
```json
{
  "data": {
    "username": "string",
    "portfolio": { "title": "string", "description": "string", "published_at": "iso" },
    "sections": [
      { "id": "uuid", "name": "string", "position": 1, "visible": true,
        "components": [ { "id": "uuid", "type": "text", "position": 1, "data": { } } ]
      }
    ]
  }
}
```
- Errors: 404 not_found, 403 if not published

### 2.8 Error intake
POST `/api/v1/errors`
- Description: Insert-only logging intake for clients and server subsystems (mirrors `public.log_app_error` RPC). Open to anon and auth.
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
- Errors: 413 payload_too_large, 422 validation

(Admin/service-only management of errors — list/query/cleanup — should be internal using service role and not exposed publicly in MVP.)

### 2.9 System
- GET `/api/v1/health` → `{ "data": { "status": "ok", "time": "iso" } }`
- GET `/api/v1/version` → `{ "data": { "version": "semver", "commit": "sha" } }`

## 3. Authentication and Authorization
- Mechanism: Supabase Auth (GitHub OAuth, email/password)
  - Clients authenticate directly with Supabase to obtain a JWT. API validates JWT and forwards to Supabase queries using row-level security (RLS) policies defined in the DB.
- Authorization model
  - Ownership enforced via RLS:
    - `portfolios`: `user_id = auth.uid()` for SELECT/INSERT/UPDATE
    - `sections`/`components`: ownership via join from `sections.portfolio_id` to `portfolios.user_id`
  - `app_errors`: insert allowed for anon and authenticated; no read/update/delete via RLS
- Token transport: `Authorization: Bearer <supabase_jwt>`
- Session: `GET /auth/session` fetches current user and `user_profiles` row
- Service role usage: background jobs (e.g., cleanup utilities) use Supabase service key server-side only

## 4. Validation and Business Logic
Validation (API layer, mirroring DB constraints)
- `portfolios`
  - `title`: required, ≤100 chars
  - `description`: optional
  - Uniqueness: one portfolio per `user_id`; return 409 if exists
- `sections`
  - `name`: required, ≤150 chars
  - `position`: integer ≥1; maintained gapless per portfolio ordering
  - Max 10 sections per portfolio; enforce on create with fast count + guard
  - `visible`: boolean
- `components`
  - `type`: must be one of `component_type` enum
  - `data`: non-empty JSON object; type-specific validation (see 2.4)
  - `position`: auto-assigned sequentially; reorder validates bounds
  - Global cap: max 15 components per portfolio (sum over all sections)
  - Content limits per PRD: short texts ≤500, long texts ≤2000, images ≤2MB
- `app_errors`
  - `severity`: `debug|info|warn|error|fatal`
  - `source`: `frontend|api|edge|worker|db|other`
  - `message`: required
  - `context`: JSON object; truncate if exceeding server-configured size
- `user_profiles`
  - `username`: regex `^[a-z0-9-]{3,30}$`, lowercase, unique; immutable once set

Business logic
- Publish rules: require at least one section and at least one component across the portfolio; set `is_published=true`, `published_at=now()`; unpublish reverses fields
- Limits: enforce 10 sections and 15 components caps with 409 responses
- Reordering: maintain stable, collision-free `position` integers; use transactional, optimistic updates
- Importers
  - GitHub: user should be able to select repositories to which API has access. Fetch README and metadata; extract tech (language/topics); create `project_card` components respecting limits; deduplicate by repo URL
  - LinkedIn: call AI model (OpenRouter) to parse; optionally create `bio`/`ordered_list` components
- Error intake: non-blocking; respond 202 and persist asynchronously when possible; attach `client_ip` and `user_agent` on server

Security and resilience
- Rate limiting: default 60 req/min/IP; stricter for `/imports/*` (e.g., 10 req/min) and `/errors` (200 req/min)
- CORS: allow app origins; block wildcard except for public endpoints if needed
- Request IDs: accept `X-Request-Id` or generate; echo in error payloads
- Idempotency: support `Idempotency-Key` for publish and importer actions
- Input sanitization: HTML/URL validation; restrict image sizes; reject unknown fields
- Logging: structured logs with `user_id`, `route`, `request_id`
- Pagination DoS guard: enforce `per_page` ≤100, timeouts with sensible DB indexes

Performance considerations
- Use indexed queries per section/component ordering and filtering
- Batch create for importer to minimize round-trips
- Cache public portfolio payloads (username key) for short TTL to accelerate SSR
- Leverage GIN index on `components(data)` for lightweight search (`q` param)

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
  "id": "uuid", "user_id": "uuid", "is_published": false,
  "published_at": "iso|null", "title": "string", "description": "string|null",
  "created_at": "iso"
}
```
- Section
```json
{ "id": "uuid", "portfolio_id": "uuid", "name": "string", "position": 1, "visible": true }
```
- Component
```json
{ "id": "uuid", "section_id": "uuid", "type": "enum", "position": 1, "data": {} }
```
- Public Portfolio Payload
```json
{ "username": "string", "portfolio": { }, "sections": [ { "components": [ ] } ] }
```
- Error
```json
{ "error": { "code": "string", "message": "string", "details": {}, "requestId": "string" } }
```

## 7. Compatibility with Tech Stack
- Astro 5 + React 19: Public endpoint optimized for SSR; dashboard endpoints return JSON for React islands. Place handlers under `src/pages/api/v1/*`.
- TypeScript 5: Define shared DTOs in `src/types.ts` aligning with shapes above.
- Tailwind 4 + shadcn/ui: No API impact; consider list endpoints for dashboard UIs with sort/filter.
- Supabase: Use RLS policies as designed; service role only for internal jobs; DB enums mirror API enums.
- OpenRouter: Server-side integration with rate-limited, retried calls for LinkedIn parsing.
- GitHub: OAuth token supplied by client or via server exchange; respect GitHub API pagination.

## 8. Non-Functional Requirements
- Observability: traces for importer and publish actions; structured logs
- Backoff and retries for external API calls
- Strict timeouts: 10s for standard, 20s for importer
- Payload limits: 256 KB JSON by default; images uploaded via separate object store (future)
- Internationalization: content in components stored as UTF-8; API messages in English


## 9. TODO List
- [x] /api/v1/auth/session
- [x] /api/v1/auth/username-availability
- [ ] /api/v1/auth/claim-username
- [ ] /api/v1/portfolios/me
- [ ] /api/v1/portfolios
- [ ] /api/v1/portfolios/:id
- [ ] /api/v1/portfolios/:id/publish
- [ ] /api/v1/portfolios/:id/unpublish
- [ ] /api/v1/portfolios/:portfolioId/sections
- [ ] /api/v1/portfolios/:portfolioId/sections
- [ ] /api/v1/sections/:id
- [ ] /api/v1/sections/:id/reorder
- [ ] /api/v1/sections/:id
- [ ] /api/v1/sections/:sectionId/components
- [ ] /api/v1/sections/:sectionId/components
- [ ] /api/v1/components/:id
- [ ] /api/v1/components/:id/reorder
- [ ] /api/v1/components/:id
- [ ] /api/v1/imports/github/repos
- [ ] /api/v1/imports/github/generate-project-cards
- [ ] /api/v1/imports/linkedin/parse
- [ ] /api/v1/public/portfolios/:username
- [ ] /api/v1/errors
- [ ] /api/v1/health
- [ ] /api/v1/version