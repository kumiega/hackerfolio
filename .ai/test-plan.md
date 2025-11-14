# Comprehensive Test Plan for Hackerfolio

## 1. Introduction and Testing Objectives

### 1.1 Purpose
This test plan defines the testing strategy, scope, resources, schedule, and approach for validating the Hackerfolio MVP application - an AI-powered portfolio builder for developers.

### 1.2 Testing Objectives
- Verify all functional requirements as defined in the PRD are met
- Ensure security and data integrity across authentication, authorization, and data operations
- Validate third-party integrations (GitHub API, OpenRouter AI) work reliably
- Confirm UI/UX quality, including drag-and-drop functionality and responsive design
- Assess application performance under expected load conditions
- Verify cross-browser and mobile compatibility
- Ensure accessibility compliance (WCAG 2.1 AA)
- Validate the draft/publish workflow and data consistency

### 1.3 Success Criteria
- 100% of critical path user stories pass acceptance tests
- Zero critical or high-priority bugs in production features
- API response times < 2 seconds for 95th percentile
- All security tests pass (authentication, authorization, data protection)
- Accessibility score of 90+ (Lighthouse)
- Cross-browser compatibility verified on Chrome, Firefox, Safari, Edge

---

## 2. Scope of Testing

### 2.1 In Scope

#### 2.1.1 Functional Areas
- **Authentication & Authorization**
  - GitHub OAuth flow
  - Session management
  - Row-level security (RLS) policies
  - Token validation and refresh
  
- **User Onboarding**
  - Username claiming and validation
  - Subdomain uniqueness checks
  - Quick start wizard (GitHub/LinkedIn import)
  - Onboarding completion flow
  
- **Portfolio Management**
  - Create, read, update portfolio data
  - Draft data management
  - Publishing workflow (draft → published)
  - Unpublishing capability
  - Auto-save functionality
  
- **Section & Component Management**
  - CRUD operations for sections
  - CRUD operations for components (7 types)
  - Drag-and-drop reordering
  - Visibility toggling
  - Validation (max 10 sections, max 15 components)
  
- **GitHub Integration**
  - Repository listing
  - Repository selection (3-10)
  - Project card generation from README
  - Technology detection
  - GitHub API error handling
  
- **LinkedIn Integration**
  - Form-based data entry
  - AI-powered portfolio generation
  - Preview before import
  - Data validation
  
- **AI Generation**
  - Portfolio structure generation
  - Content generation from user input
  - Error handling and fallback models
  - Response validation
  
- **Public Portfolio Pages**
  - SSR rendering of published portfolios
  - Subdomain routing
  - Cache control
  - SEO metadata
  
- **Preview Functionality**
  - Draft preview for authenticated users
  - Real-time updates
  - Access control
  
- **Dashboard UI**
  - Split-view layout
  - Drag-and-drop interface
  - Form validation
  - Toast notifications
  - Loading states
  - Dark mode support

#### 2.1.2 Non-Functional Areas
- Performance testing (API response times, page load times)
- Security testing (authentication, authorization, data protection)
- Accessibility testing (WCAG 2.1 AA compliance)
- Cross-browser compatibility
- Mobile responsiveness
- Error handling and recovery
- Rate limiting

### 2.2 Out of Scope
- Custom domain setup (not in MVP)
- Multiple themes/templates (only one template in MVP)
- CV/resume generation
- Analytics features
- Email notifications
- Payment processing
- Multi-language support
- Third-party OAuth providers other than GitHub

---

## 3. Types of Tests to Be Performed

### 3.1 Unit Tests
**Target Coverage:** 70-80% for critical business logic

**Focus Areas:**
- Service layer functions (AuthService, PortfolioService, GitHubService, OpenRouterService)
- Validation functions (component data validation, section validation)
- Utility functions (string manipulation, date formatting, slug generation)
- Schema validation (Zod schemas)
- Error handling functions

**Tools:** Vitest, React Testing Library

**Example Test Cases:**
- `AuthService.claimUsername()` validates username format
- `PortfolioService.publishPortfolio()` enforces minimum requirements
- `GitHubService.fetchRepositoryInfo()` handles API errors correctly
- Component data validation rejects invalid data structures

### 3.2 Integration Tests
**Focus Areas:**
- API endpoint testing (all /api/v1/* routes)
- Database operations with RLS policies
- Service-to-service interactions
- Third-party API integrations (mocked)

**Tools:** Vitest, Supertest (for API testing), Supabase test client

**Example Test Cases:**
- POST /api/v1/portfolios creates portfolio with correct user_id
- PATCH /api/v1/portfolios/:id enforces ownership validation
- GET /api/v1/portfolios/me returns only user's own portfolio
- POST /api/v1/imports/github/cards validates GitHub token
- POST /api/v1/imports/linkedin/profile generates valid portfolio structure
- RLS policies prevent unauthorized data access

### 3.3 End-to-End (E2E) Tests
**Focus Areas:**
- Critical user journeys
- Multi-step workflows
- UI interactions

**Tools:** Playwright or Cypress

**Priority Test Scenarios:**

#### P0 - Critical Path
1. **Complete Onboarding Flow**
   - Login with GitHub → Choose username → Complete onboarding → Redirect to dashboard

2. **Create and Publish Portfolio**
   - Add section → Add component → Publish → Verify public page

3. **GitHub Import Flow**
   - Navigate to imports → Select repositories → Generate cards → Save to portfolio

4. **Edit and Republish**
   - Modify published portfolio → Save changes → Republish → Verify updates

#### P1 - Important Workflows
5. **LinkedIn Import Flow**
   - Fill LinkedIn form → Generate with AI → Preview → Accept → Save

6. **Drag-and-Drop Reordering**
   - Reorder sections → Reorder components within section → Move component between sections

7. **Preview Draft**
   - Make changes → Open preview → Verify draft content

8. **Account Deletion**
   - Navigate to settings → Delete account → Confirm deletion

### 3.4 Performance Tests
**Focus Areas:**
- API response times under load
- Page load times (SSR)
- Database query optimization
- Third-party API timeout handling

**Tools:** Artillery, Lighthouse, Chrome DevTools

**Test Scenarios:**
- API endpoints handle 100 concurrent requests
- Portfolio page loads in < 3 seconds (P95)
- Dashboard loads in < 2 seconds (P95)
- GitHub import handles large repositories (> 1MB README)
- AI generation completes within 30-second timeout

**Acceptance Criteria:**
- API response times < 2s (P95)
- Page load times < 3s (P95)
- No memory leaks during extended sessions
- Graceful degradation under high load

### 3.5 Security Tests
**Focus Areas:**
- Authentication and authorization
- Data protection
- Input validation
- XSS and injection prevention

**Test Scenarios:**

#### Authentication & Authorization
- ✓ Unauthenticated users cannot access protected routes
- ✓ Users cannot access other users' portfolios (draft_data)
- ✓ RLS policies enforce data isolation
- ✓ Session expiration redirects to login
- ✓ Invalid tokens are rejected

#### Input Validation
- ✓ SQL injection attempts are blocked
- ✓ XSS payloads in component data are sanitized
- ✓ File upload size limits are enforced (2MB)
- ✓ JSONB structure validation prevents malformed data
- ✓ Username validation prevents special characters

#### Data Protection
- ✓ OAuth tokens are stored securely
- ✓ Sensitive data is not exposed in API responses
- ✓ CORS is properly configured
- ✓ Rate limiting prevents abuse

### 3.6 Accessibility Tests
**Focus Areas:**
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- ARIA labels
- Focus management

**Tools:** axe DevTools, Lighthouse, NVDA/JAWS

**Test Scenarios:**
- ✓ All interactive elements are keyboard accessible
- ✓ Drag-and-drop has keyboard alternative
- ✓ Forms have proper labels and error messages
- ✓ Color contrast meets WCAG AA standards
- ✓ Dynamic content updates are announced to screen readers
- ✓ Focus is properly managed in modals and drawers

### 3.7 Cross-Browser & Device Testing
**Browsers:**
- Chrome (latest, -1)
- Firefox (latest, -1)
- Safari (latest, -1)
- Edge (latest)

**Devices:**
- Desktop (1920x1080, 1366x768)
- Tablet (iPad, 768x1024)
- Mobile (iPhone 14, Galaxy S21)

**Test Areas:**
- Layout rendering
- Drag-and-drop functionality
- Form interactions
- Modal/drawer behavior
- Dark mode appearance

### 3.8 Regression Tests
**Approach:**
- Automated test suite runs on every PR
- Critical path E2E tests run before deployment
- Smoke tests verify core functionality after deployment

**Coverage:**
- Authentication flow
- Portfolio CRUD operations
- Publishing workflow
- GitHub/LinkedIn import
- Public portfolio rendering

---

## 4. Test Scenarios for Key Functionalities

### 4.1 Authentication & Onboarding

#### TC-AUTH-001: GitHub OAuth Login
**Preconditions:** User not authenticated
**Steps:**
1. Navigate to /login
2. Click "Login with GitHub"
3. Complete GitHub OAuth consent
**Expected:** User redirected to onboarding (new user) or dashboard (returning user)

#### TC-AUTH-002: Username Claiming
**Preconditions:** Authenticated user, no username set
**Steps:**
1. On onboarding page, enter username "johndoe"
2. System validates uniqueness
3. Submit form
**Expected:** Username saved, user marked as onboarded

#### TC-AUTH-003: Username Uniqueness
**Preconditions:** Username "testuser" already exists
**Steps:**
1. Attempt to claim username "testuser"
**Expected:** Error message "Username already taken"

#### TC-AUTH-004: Username Validation
**Preconditions:** Onboarding page
**Steps:**
1. Enter invalid username "John Doe!" (spaces, special chars)
**Expected:** Validation error displayed

### 4.2 Portfolio Management

#### TC-PORT-001: Create Portfolio
**Preconditions:** User onboarded, no portfolio exists
**Steps:**
1. Navigate to dashboard
2. System auto-creates portfolio
**Expected:** Empty portfolio with default bio structure created

#### TC-PORT-002: Add Section
**Preconditions:** Portfolio exists
**Steps:**
1. Click "Add Section"
2. Enter section title "Projects"
3. Save
**Expected:** Section appears in sections list

#### TC-PORT-003: Add Component to Section
**Preconditions:** Section exists
**Steps:**
1. Click "Add Component" on section
2. Select "Text" component type
3. Fill content (< 2000 chars)
4. Save
**Expected:** Component appears in section

#### TC-PORT-004: Enforce Section Limit
**Preconditions:** Portfolio has 10 sections
**Steps:**
1. Attempt to add 11th section
**Expected:** Error: "Maximum 10 sections allowed"

#### TC-PORT-005: Enforce Component Limit
**Preconditions:** Portfolio has 15 components across sections
**Steps:**
1. Attempt to add 16th component
**Expected:** Error: "Maximum 15 components allowed"

#### TC-PORT-006: Auto-save
**Preconditions:** Component editor open
**Steps:**
1. Edit component data
2. Wait 2 seconds
**Expected:** Toast notification "Saved", unsaved indicator cleared

### 4.3 Drag-and-Drop

#### TC-DND-001: Reorder Sections
**Preconditions:** Portfolio has sections A, B, C
**Steps:**
1. Drag section B above section A
**Expected:** Order changes to B, A, C; changes auto-saved

#### TC-DND-002: Reorder Components Within Section
**Preconditions:** Section has components 1, 2, 3
**Steps:**
1. Drag component 3 to first position
**Expected:** Order changes to 3, 1, 2; changes auto-saved

#### TC-DND-003: Move Component Between Sections
**Preconditions:** Section A has component X, Section B exists
**Steps:**
1. Drag component X from Section A to Section B
**Expected:** Component X now in Section B; changes auto-saved

#### TC-DND-004: Keyboard Navigation for Drag-and-Drop
**Preconditions:** Portfolio has sections
**Steps:**
1. Tab to section drag handle
2. Press Space to activate
3. Use arrow keys to move
4. Press Space to drop
**Expected:** Section reordered successfully

### 4.4 Publishing Workflow

#### TC-PUB-001: Publish Valid Portfolio
**Preconditions:** Portfolio has ≥1 section with ≥1 component
**Steps:**
1. Click "Publish" button
2. Confirm
**Expected:** 
- Toast "Portfolio published"
- published_data = draft_data
- last_published_at set
- Public page accessible at /{username}

#### TC-PUB-002: Publish Validation - No Sections
**Preconditions:** Portfolio has 0 sections
**Steps:**
1. Click "Publish"
**Expected:** Error "Portfolio must have at least 1 section with 1 component"

#### TC-PUB-003: Publish Validation - Empty Section
**Preconditions:** Portfolio has 1 section with 0 components
**Steps:**
1. Click "Publish"
**Expected:** Error "Portfolio must have at least 1 section with 1 component"

#### TC-PUB-004: Republish After Changes
**Preconditions:** Portfolio published, changes made to draft
**Steps:**
1. Edit draft_data
2. Click "Publish" again
**Expected:** published_data updated, last_published_at updated

#### TC-PUB-005: Preview Draft
**Preconditions:** Draft differs from published
**Steps:**
1. Click "Preview" button
**Expected:** New tab opens to /preview/{username} showing draft_data

### 4.5 GitHub Integration

#### TC-GH-001: List Repositories
**Preconditions:** User authenticated with GitHub OAuth
**Steps:**
1. Navigate to GitHub import page
2. System fetches repositories
**Expected:** User's repositories displayed with metadata

#### TC-GH-002: Generate Cards from Repositories
**Preconditions:** On GitHub import page
**Steps:**
1. Select 3 repositories
2. Click "Generate Cards"
3. System fetches README and detects tech
**Expected:** 3 card components generated with title, summary, tech

#### TC-GH-003: GitHub API Rate Limit
**Preconditions:** GitHub API rate limit exhausted
**Steps:**
1. Attempt to fetch repositories
**Expected:** Error message "GitHub API rate limit exceeded. Try again later."

#### TC-GH-004: Repository Not Found
**Preconditions:** Repository URL for deleted/private repo
**Steps:**
1. Attempt to generate card for invalid repo
**Expected:** Error "Repository not found or inaccessible"

#### TC-GH-005: Import Validation - Min/Max Repos
**Preconditions:** GitHub import page
**Steps:**
1. Select 0 repositories → Error
2. Select 11 repositories → Error
3. Select 5 repositories → Success
**Expected:** Validation enforces 1-10 repository limit

### 4.6 LinkedIn Integration

#### TC-LI-001: Generate from LinkedIn Form
**Preconditions:** Dashboard, LinkedIn import page
**Steps:**
1. Fill form: name, headline, experience, education
2. Click "Generate"
3. AI processes input
**Expected:** Portfolio structure generated with sections/components

#### TC-LI-002: Preview Generated Portfolio
**Preconditions:** AI generation complete
**Steps:**
1. Review generated sections
2. Click "Accept"
**Expected:** Sections added to draft_data

#### TC-LI-003: Edit Before Import
**Preconditions:** AI generation complete
**Steps:**
1. Edit generated section title
2. Click "Accept"
**Expected:** Modified sections added to draft_data

#### TC-LI-004: AI Timeout Handling
**Preconditions:** AI API unresponsive
**Steps:**
1. Submit LinkedIn form
2. Wait > 30 seconds
**Expected:** Timeout error with retry option

#### TC-LI-005: AI Validation Failure
**Preconditions:** AI returns invalid JSON
**Steps:**
1. Submit form, AI returns malformed response
**Expected:** Error "Failed to generate portfolio. Please try again."

### 4.7 Public Portfolio Pages

#### TC-PUB-PAGE-001: Render Published Portfolio
**Preconditions:** User published portfolio
**Steps:**
1. Navigate to /{username} (unauthenticated)
**Expected:** 
- Published portfolio renders via SSR
- Bio section visible
- Sections and components display correctly

#### TC-PUB-PAGE-002: Unpublished Portfolio Returns 404
**Preconditions:** User has draft but not published
**Steps:**
1. Navigate to /{username}
**Expected:** 404 page or "Portfolio not published"

#### TC-PUB-PAGE-003: SEO Metadata
**Preconditions:** Published portfolio
**Steps:**
1. View page source of /{username}
**Expected:** 
- Title tag includes user's name
- Meta description present
- Open Graph tags present

#### TC-PUB-PAGE-004: Dark Mode
**Preconditions:** Published portfolio
**Steps:**
1. Toggle dark mode on /{username}
**Expected:** Dark theme applied correctly

### 4.8 Error Handling

#### TC-ERR-001: Network Error During Save
**Preconditions:** Editing portfolio
**Steps:**
1. Disconnect network
2. Make changes
3. Auto-save triggers
**Expected:** Toast "Failed to save. Retrying..." then error after retries

#### TC-ERR-002: Invalid Session
**Preconditions:** User logged in
**Steps:**
1. Manually delete auth token
2. Attempt API request
**Expected:** Redirect to login with message

#### TC-ERR-003: Database Connection Lost
**Preconditions:** Supabase unavailable
**Steps:**
1. Attempt to load dashboard
**Expected:** Error page with retry option

### 4.9 Settings & Account Management

#### TC-SET-001: Change Username
**Preconditions:** User with username "oldname"
**Steps:**
1. Navigate to Settings
2. Change username to "newname"
3. Save
**Expected:** Username updated, subdomain changed

#### TC-SET-002: Delete Account
**Preconditions:** User authenticated
**Steps:**
1. Navigate to Settings
2. Click "Delete Account"
3. Enter confirmation text
4. Confirm
**Expected:** 
- Account deleted
- Portfolio deleted
- User logged out
- Redirect to landing page

---

## 5. Test Environment

### 5.1 Development Environment
- **Purpose:** Local testing, unit tests, integration tests
- **Setup:**
  - Local Node.js v22.14.0
  - Local Supabase instance (or dev project)
  - Mocked third-party APIs (GitHub, OpenRouter)
- **Database:** Supabase dev/local instance
- **Domain:** localhost:4321

### 5.2 Staging Environment
- **Purpose:** E2E tests, UAT, pre-production validation
- **Setup:**
  - DigitalOcean staging server
  - Supabase staging project
  - Real GitHub OAuth (test app)
  - Real OpenRouter API (with test key/quotas)
- **Database:** Supabase staging instance with anonymized test data
- **Domain:** staging.hackerfolio.dev

### 5.3 Production Environment
- **Purpose:** Smoke tests, monitoring, hotfix validation
- **Setup:**
  - DigitalOcean production server
  - Supabase production project
  - Real GitHub OAuth
  - Real OpenRouter API
- **Database:** Supabase production instance
- **Domain:** hackerfolio.com, *.hackerfolio.com

### 5.4 Test Data
- **User Accounts:**
  - test-user-1@example.com (onboarded, published portfolio)
  - test-user-2@example.com (onboarded, draft only)
  - test-user-3@example.com (not onboarded)
- **GitHub Tokens:** Test OAuth tokens with read-only repo access
- **Sample Portfolios:** Pre-populated test portfolios with various configurations

---

## 6. Testing Tools

### 6.1 Test Frameworks & Libraries
| Tool | Purpose | Rationale |
|------|---------|-----------|
| **Vitest** | Unit & integration tests | Fast, TypeScript support, Vite integration |
| **Playwright** | E2E testing | Cross-browser, reliable, great API |
| **React Testing Library** | Component testing | Best practices, user-centric |
| **Supertest** | API testing | Simple HTTP assertions |
| **MSW (Mock Service Worker)** | API mocking | Realistic HTTP mocking |

### 6.2 Quality & Monitoring Tools
| Tool | Purpose |
|------|---------|
| **Lighthouse** | Performance & accessibility auditing |
| **axe DevTools** | Accessibility testing |
| **Artillery** | Load testing |
| **ESLint** | Static code analysis |
| **TypeScript** | Type checking |
| **Prettier** | Code formatting |

### 6.3 CI/CD Integration
- **GitHub Actions** for automated test execution
- **Husky** for pre-commit hooks (linting, type checking)
- **lint-staged** for staged file validation

### 6.4 Test Reporting
- **Vitest UI** for unit/integration test results
- **Playwright HTML Reporter** for E2E test results
- **GitHub Actions Summary** for CI pipeline results
- **Lighthouse Reports** for performance metrics

---

## 7. Test Schedule

### 7.1 Sprint-Based Testing

#### Phase 1: Foundation (Week 1-2)
- Setup test infrastructure (Vitest, Playwright)
- Write unit tests for core services
- Integration tests for API endpoints
- Initial E2E tests for auth flow

**Deliverables:**
- ✓ Test framework configured
- ✓ 50% unit test coverage
- ✓ Critical API endpoints tested
- ✓ Auth flow E2E test

#### Phase 2: Feature Development (Week 3-6)
- Unit tests written alongside feature development
- Integration tests for new endpoints
- E2E tests for major user journeys
- Continuous regression testing

**Deliverables:**
- ✓ 70% unit test coverage
- ✓ All API endpoints tested
- ✓ P0 E2E scenarios automated
- ✓ Performance baseline established

#### Phase 3: Pre-Release (Week 7-8)
- Complete remaining E2E tests
- Cross-browser testing
- Accessibility audit
- Security testing
- Performance optimization
- UAT with beta users

**Deliverables:**
- ✓ 80% overall test coverage
- ✓ All P0 and P1 E2E tests pass
- ✓ Accessibility score 90+
- ✓ Security audit complete
- ✓ Performance benchmarks met

#### Phase 4: Release & Monitoring (Week 9+)
- Production smoke tests
- Monitoring and alerting setup
- Hotfix testing process
- Regression suite maintenance

**Deliverables:**
- ✓ Production monitoring active
- ✓ Smoke test suite automated
- ✓ Incident response playbook

### 7.2 Testing Cadence

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Unit tests | On every commit | Developers |
| Integration tests | On every PR | CI/CD |
| E2E smoke tests | On every PR | CI/CD |
| Full E2E suite | Daily (staging) | QA Engineer |
| Performance tests | Weekly | QA Engineer |
| Accessibility audit | Sprint end | QA Engineer |
| Security scan | Weekly | DevOps/Security |
| UAT | Before release | Product Manager |

---

## 8. Test Acceptance Criteria

### 8.1 Test Completion Criteria
- ✓ All P0 test cases executed and passed
- ✓ 95% of P1 test cases executed and passed
- ✓ Zero critical bugs open
- ✓ No high-priority bugs older than 48 hours
- ✓ Code coverage ≥ 70% for critical business logic
- ✓ All security tests passed
- ✓ Performance benchmarks met

### 8.2 Feature Acceptance Criteria
A feature is considered complete when:
- ✓ All associated user stories pass acceptance tests
- ✓ Unit tests written and passing (≥70% coverage)
- ✓ Integration tests passing
- ✓ E2E test written for critical path
- ✓ Accessibility review passed
- ✓ Performance impact assessed
- ✓ Security review passed (if applicable)
- ✓ Documentation updated

### 8.3 Release Readiness Criteria
The application is ready for production release when:
- ✓ All test completion criteria met
- ✓ UAT sign-off from stakeholders
- ✓ No open critical/high bugs
- ✓ Performance tests passed on staging
- ✓ Security audit completed
- ✓ Backup and rollback plan verified
- ✓ Monitoring and alerting configured
- ✓ Runbook documented

### 8.4 Quality Gates

#### Code Quality Gate
- ✓ ESLint: 0 errors
- ✓ TypeScript: 0 type errors
- ✓ Prettier: All files formatted
- ✓ No commented-out code
- ✓ No TODO comments in critical paths

#### Test Quality Gate
- ✓ All tests pass
- ✓ No flaky tests
- ✓ Test execution time < 10 minutes (unit + integration)
- ✓ E2E test execution time < 30 minutes
- ✓ No skipped tests in CI

#### Performance Quality Gate
- ✓ Lighthouse Performance score ≥ 85
- ✓ API P95 response time < 2s
- ✓ Page load P95 time < 3s
- ✓ No memory leaks detected
- ✓ Bundle size < 500KB (gzipped)

#### Security Quality Gate
- ✓ No SQL injection vulnerabilities
- ✓ XSS prevention verified
- ✓ CSRF protection enabled
- ✓ RLS policies enforced
- ✓ Secrets not exposed in client code
- ✓ Rate limiting configured

#### Accessibility Quality Gate
- ✓ Lighthouse Accessibility score ≥ 90
- ✓ axe DevTools: 0 critical violations
- ✓ Keyboard navigation verified
- ✓ Screen reader testing passed
- ✓ Color contrast WCAG AA compliant

---

## 9. Roles and Responsibilities

### 9.1 Test Team Structure

| Role | Responsibilities | Team Member |
|------|------------------|-------------|
| **QA Lead** | Test strategy, planning, reporting, stakeholder communication | TBD |
| **QA Engineer** | Test execution, automation, bug reporting, E2E tests | TBD |
| **Developers** | Unit tests, integration tests, bug fixes, code reviews | Development Team |
| **Product Manager** | UAT, acceptance criteria definition, priority setting | TBD |
| **DevOps Engineer** | CI/CD pipeline, test environment setup, performance monitoring | TBD |

### 9.2 Developer Responsibilities
Developers are responsible for:
- Writing unit tests for all new code (target: 70%+ coverage)
- Writing integration tests for API endpoints
- Fixing bugs within SLA (Critical: 24h, High: 48h, Medium: 1 week)
- Participating in code reviews with test coverage checks
- Running tests locally before pushing commits
- Documenting test cases for complex logic

### 9.3 QA Engineer Responsibilities
QA Engineers are responsible for:
- Creating and maintaining E2E test suite
- Executing manual test cases for new features
- Performing exploratory testing
- Cross-browser and device testing
- Accessibility testing
- Performance testing
- Security testing (with DevOps)
- Bug triage and reporting
- Test documentation and maintenance

### 9.4 Product Manager Responsibilities
Product Manager is responsible for:
- Defining acceptance criteria for user stories
- Conducting UAT with beta users
- Prioritizing bugs and test cases
- Sign-off on feature completion
- Release readiness decision

### 9.5 DevOps Engineer Responsibilities
DevOps Engineer is responsible for:
- Setting up and maintaining test environments
- Configuring CI/CD pipelines for automated testing
- Performance monitoring and load testing
- Security scanning and vulnerability management
- Backup and disaster recovery testing

---

## 10. Bug Reporting Procedures

### 10.1 Bug Severity Classification

| Severity | Definition | Examples | SLA |
|----------|------------|----------|-----|
| **Critical** | Application unusable, data loss, security breach | Auth failure, data corruption, XSS vulnerability | 24 hours |
| **High** | Major feature broken, workaround exists | Publishing fails, GitHub import broken | 48 hours |
| **Medium** | Feature partially broken, minor impact | Drag-and-drop glitchy, styling issue | 1 week |
| **Low** | Cosmetic issue, minimal impact | Text alignment, tooltip missing | 2 weeks |

### 10.2 Bug Reporting Template

```markdown
### Bug ID
BUG-XXX

### Title
[Brief, descriptive title]

### Severity
Critical / High / Medium / Low

### Environment
- Browser: Chrome 122
- OS: macOS 14.2
- Environment: Staging
- URL: https://staging.hackerfolio.dev/dashboard

### Steps to Reproduce
1. Navigate to dashboard
2. Click "Add Section"
3. Enter section title
4. Click Save

### Expected Behavior
Section should be added and visible in sections list

### Actual Behavior
Section is not saved, error message appears

### Screenshots/Videos
[Attach screenshots or videos]

### Console Errors
```
TypeError: Cannot read property 'id' of undefined
  at portfolioService.ts:45
```

### Additional Context
- Happens only with special characters in title
- Works fine on development environment
- Reproducible 100% of the time
```

### 10.3 Bug Workflow

```
[New] → [Triaged] → [In Progress] → [Fixed] → [Testing] → [Closed]
         ↓
      [Duplicate/Invalid] → [Closed]
```

**States:**
1. **New:** Bug reported, awaiting triage
2. **Triaged:** Severity assigned, developer assigned
3. **In Progress:** Developer working on fix
4. **Fixed:** Fix committed, awaiting deployment
5. **Testing:** QA verifying fix
6. **Closed:** Fix verified, bug resolved
7. **Duplicate/Invalid:** Bug is duplicate or not reproducible

### 10.4 Bug Triage Process

**Frequency:** Daily (during active development), 2x per week (maintenance)

**Participants:** QA Lead, Tech Lead, Product Manager

**Process:**
1. Review all new bugs
2. Verify reproducibility
3. Assign severity
4. Assign developer
5. Set priority and sprint
6. Update stakeholders on critical bugs

### 10.5 Bug Metrics & Reporting

**Weekly Report Includes:**
- Total bugs opened vs. closed
- Bugs by severity
- Average time to fix (by severity)
- Top 5 bug-prone areas
- Blocker/critical bugs status

**Monthly Report Includes:**
- Bug trends over time
- Escaped defects (found in production)
- Test coverage metrics
- Flaky test report

---

## 11. Risks and Mitigation

### 11.1 Testing Risks

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| **Third-party API unavailability** (GitHub, OpenRouter) | High | Medium | Mock APIs for testing; implement retry logic; fallback error handling |
| **Test environment instability** | Medium | Medium | Infrastructure as Code; automated environment setup; staging environment parity |
| **Flaky E2E tests** | Medium | High | Implement proper waits; use test isolation; retry failed tests; quarantine flaky tests |
| **Insufficient test coverage** | High | Medium | Enforce coverage thresholds in CI; regular code reviews; prioritize critical path coverage |
| **Performance degradation** | High | Low | Continuous performance monitoring; load testing before release; database query optimization |
| **Security vulnerabilities** | Critical | Low | Regular security audits; dependency scanning; penetration testing; secure coding training |
| **Browser compatibility issues** | Medium | Medium | Cross-browser testing in CI; use progressive enhancement; test on real devices |
| **Test data management** | Low | Medium | Automated test data generation; data anonymization; database snapshots for rollback |

### 11.2 Project Risks Affecting Testing

| Risk | Impact | Mitigation Strategy |
|------|--------|---------------------|
| **Tight deadlines** | Reduced test coverage | Focus on critical path; automate smoke tests; prioritize P0/P1 scenarios |
| **Changing requirements** | Test case rework | Agile testing approach; continuous test maintenance; flexible test framework |
| **Limited QA resources** | Delayed testing | Developer-driven testing; test automation; shift-left strategy |
| **Lack of testing expertise** | Poor test quality | Training and documentation; pair testing; code reviews |

---

## 12. Test Plan Maintenance

### 12.1 Review and Updates
- Test plan reviewed at end of each sprint
- Updated when new features are added
- Revised after major architectural changes
- Accessibility and security sections updated quarterly

### 12.2 Document Version Control
- Test plan stored in Git repository (.ai/test-plan.md)
- Changes tracked via Git commits
- Major revisions tagged with version numbers

### 12.3 Stakeholder Communication
- Test status reported in sprint reviews
- Critical bugs escalated immediately
- Weekly test summary email
- Monthly quality metrics dashboard

---

## Appendix A: Test Case Traceability Matrix

| Requirement ID | User Story | Test Cases | Priority |
|----------------|------------|------------|----------|
| US-001 | GitHub OAuth Login | TC-AUTH-001 | P0 |
| US-002 | Onboarding | TC-AUTH-002, TC-AUTH-003, TC-AUTH-004 | P0 |
| US-003 | Choose Subdomain | TC-AUTH-002, TC-AUTH-003 | P0 |
| US-005 | LinkedIn Import | TC-LI-001 to TC-LI-005 | P1 |
| US-006 | GitHub Import | TC-GH-001 to TC-GH-005 | P1 |
| US-007 | Manage Sections | TC-PORT-002, TC-PORT-004, TC-DND-001 | P0 |
| US-008 | Manage Components | TC-PORT-003, TC-PORT-005, TC-DND-002, TC-DND-003 | P0 |
| US-009 | Preview Draft | TC-PUB-005 | P1 |
| US-010 | Publish Portfolio | TC-PUB-001 to TC-PUB-004 | P0 |
| US-011 | Limits Enforcement | TC-PORT-004, TC-PORT-005 | P1 |

---

## Appendix B: Test Automation Architecture

### Test Structure
```
tests/
├── unit/
│   ├── services/
│   │   ├── auth.service.test.ts
│   │   ├── portfolio.service.test.ts
│   │   ├── github.service.test.ts
│   │   └── openrouter.service.test.ts
│   ├── lib/
│   │   ├── validation.test.ts
│   │   └── schemas.test.ts
│   └── components/
│       └── [component tests]
├── integration/
│   ├── api/
│   │   ├── auth.test.ts
│   │   ├── portfolios.test.ts
│   │   ├── imports.test.ts
│   │   └── profiles.test.ts
│   └── database/
│       └── rls-policies.test.ts
├── e2e/
│   ├── auth.spec.ts
│   ├── onboarding.spec.ts
│   ├── portfolio-management.spec.ts
│   ├── github-import.spec.ts
│   ├── linkedin-import.spec.ts
│   ├── publishing.spec.ts
│   └── public-portfolio.spec.ts
├── performance/
│   └── load-tests.yml
└── fixtures/
    ├── users.json
    ├── portfolios.json
    └── mock-responses.json
```

### CI/CD Pipeline
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  lint:
    - ESLint
    - TypeScript check
    - Prettier check
  
  unit-tests:
    - Run Vitest
    - Upload coverage report
  
  integration-tests:
    - Setup Supabase
    - Run integration tests
  
  e2e-tests:
    - Build application
    - Setup test database
    - Run Playwright tests
    - Upload test artifacts
  
  security:
    - Dependency audit
    - SAST scanning
    - RLS policy validation
```

---

## Appendix C: Test Data Requirements

### User Test Data
- 10 test users with various states:
  - New user (not onboarded)
  - Onboarded user (no portfolio)
  - User with draft portfolio
  - User with published portfolio
  - User with complex portfolio (max sections/components)
  - User with GitHub OAuth token
  - User with expired token

### Portfolio Test Data
- Empty portfolio
- Portfolio with 1 section, 1 component (minimum valid)
- Portfolio with 10 sections, 15 components (maximum)
- Portfolio with all component types
- Portfolio with long-form content (edge cases)
- Published vs. unpublished portfolios

### External API Mock Data
- GitHub: Repository lists, README files, API errors
- OpenRouter: Valid AI responses, timeout scenarios, malformed JSON

---

## Appendix D: Glossary

| Term | Definition |
|------|------------|
| **RLS** | Row-Level Security - Supabase database security feature |
| **SSR** | Server-Side Rendering - Rendering pages on server |
| **Draft Data** | Unpublished portfolio content being edited |
| **Published Data** | Live portfolio content visible to public |
| **Component** | Reusable content block (text, cards, etc.) |
| **Section** | Container for components |
| **OAuth** | Open Authorization - Authentication protocol |
| **E2E** | End-to-End - Full user journey testing |
| **P0/P1** | Priority 0/1 - Critical/High priority |
| **UAT** | User Acceptance Testing |
| **SLA** | Service Level Agreement - Response time commitment |

---

**Document Version:** 1.0  
**Last Updated:** November 14, 2025  
**Document Owner:** QA Team  
**Approved By:** [Product Manager, Tech Lead]

