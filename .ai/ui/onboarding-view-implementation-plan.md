# Onboarding View Implementation Plan

## 1. Overview
The Onboarding View is a single-page flow that guides new users through claiming a unique username (subdomain) and selecting a quick-start option for their portfolio setup, including GitHub or LinkedIn imports or starting blank. It integrates GitHub Import and LinkedIn Import Modals for seamless data importation. The purpose is to enable rapid portfolio creation post-authentication, ensuring a smooth user experience with real-time validation and previews.

## 2. View Routing
- Onboarding View: `/onboarding` (automatic post-auth redirect for users without a claimed username).
- GitHub Import Modal: Triggered as an overlay within `/onboarding` or `/dashboard`.
- LinkedIn Import Modal: Triggered as an overlay within `/onboarding` or `/dashboard`.

## 3. Component Structure
```
OnboardingView (main page)
├── StepIndicator (progress bar)
├── UsernameStep
│   ├── UsernameInput (with preview and availability status)
│   └── SubmitButton
├── QuickStartStep
│   ├── OptionCards (GitHub, LinkedIn, Blank)
│   └── NextButton
├── GitHubImportModal (conditional overlay)
│   ├── RepoList (searchable with checkboxes)
│   ├── GenerateButton
│   └── PreviewPane
└── LinkedInImportModal (conditional overlay)
    ├── UrlInput
    ├── ParseButton
    ├── EditableForm
    └── ImportButton
```

## 4. Component Details

### OnboardingView
- **Component description**: Root component managing the overall onboarding flow, state transitions between steps, and modal triggers. Handles authentication check and portfolio creation on completion.
- **Main elements**: `<div>` container with conditional rendering of steps; integrates modals via portals; uses Shadcn/ui Dialog for modals.
- **Handled interactions**: Step navigation (onSubmit handlers), modal open/close, form submissions.
- **Handled validation**: Ensures username is claimed before proceeding; validates at least one quick-start option selected; checks API responses for errors.
- **Types**: Uses `AuthSessionDto`, `UsernameAvailabilityDto`, `UserProfileDto`, `CreatePortfolioCommand`.
- **Props**: `initialSession: AuthSessionDto | null` (from parent or context).

### StepIndicator
- **Component description**: Displays current step progress (1/2 or 2/2) with visual indicators for username and quick-start phases.
- **Main elements**: Progress bar using Shadcn/ui Progress; step labels with icons.
- **Handled interactions**: None (static based on parent state).
- **Handled validation**: None.
- **Types**: `currentStep: number` (1 or 2).
- **Props**: `currentStep: number`, `totalSteps: number = 2`.

### UsernameStep
- **Component description**: Handles username input, real-time availability check, and subdomain preview.
- **Main elements**: Input field (Shadcn/ui Input), availability status badge (green/red), subdomain preview (e.g., `username.hackerfolio.test`), submit button.
- **Handled interactions**: `onChange` for input (debounced API call), `onSubmit` to claim username.
- **Handled validation**: Username regex `^[a-z0-9-]{3,30}$`, real-time availability via API (must be available), length 3-30 chars, lowercase only.
- **Types**: `UsernameAvailabilityDto`, `ClaimUsernameCommand`.
- **Props**: `onUsernameClaimed: (username: string) => void`, `isLoading: boolean`.

### QuickStartStep
- **Component description**: Presents quick-start options as cards, handles selection, and triggers modals or direct navigation.
- **Main elements**: Grid of OptionCard components (one for each option), conditional modal triggers.
- **Handled interactions**: Card clicks to select/open modals, `onNext` to proceed to dashboard.
- **Handled validation**: Ensures one option selected; for imports, validates modal completion.
- **Types**: None specific; uses string enums for options ('github', 'linkedin', 'blank').
- **Props**: `onOptionSelected: (option: 'github' | 'linkedin' | 'blank') => void`, `selectedOption: string | null`.

### OptionCard
- **Component description**: Individual card for each quick-start option, showing icon, title, and description.
- **Main elements**: Card (Shadcn/ui Card) with icon (Lucide React), title, description, and selection state.
- **Handled interactions**: `onClick` to select and trigger action.
- **Handled validation**: Visual feedback for selection.
- **Types**: None.
- **Props**: `option: { id: string, icon: React.ComponentType, title: string, description: string }`, `isSelected: boolean`, `onSelect: () => void`.

### GitHubImportModal
- **Component description**: Modal for selecting GitHub repos, generating project cards, and previewing results.
- **Main elements**: Dialog (Shadcn/ui Dialog) with searchable RepoList, checkboxes, progress bar, Generate button, and PreviewPane.
- **Handled interactions**: Search input change, checkbox toggles, generate submission, close.
- **Handled validation**: 3-10 repos selected; handles API rate limits.
- **Types**: `GitHubRepoDto[]`, `GenerateProjectCardsCommand`, `GenerateProjectCardsResultDto`.
- **Props**: `isOpen: boolean`, `onClose: () => void`, `onSuccess: (components: ComponentDto[]) => void`, `sectionId?: string`.

### RepoList
- **Component description**: Searchable, filterable list of user's GitHub repos with multi-select.
- **Main elements**: Input for search (Shadcn/ui Input), list of RepoItem components with Checkbox.
- **Handled interactions**: Search onChange (debounced), checkbox changes to update selection.
- **Handled validation**: Filters repos based on query; ensures selection count 3-10.
- **Types**: `GitHubRepoDto[]`, pagination from API.
- **Props**: `repos: GitHubRepoDto[]`, `selectedRepos: string[]`, `onSelectionChange: (selected: string[]) => void`, `searchQuery: string`, `onSearchChange: (query: string) => void`.

### LinkedInImportModal
- **Component description**: Modal for pasting LinkedIn URL, parsing with AI, editing parsed data, and importing as components.
- **Main elements**: Dialog with UrlInput, Parse button, conditional EditableForm for preview/edit, Import button with section selector.
- **Handled interactions**: URL input change, parse submission, form field edits, import submission.
- **Handled validation**: Valid LinkedIn URL format; edits must conform to component data limits (e.g., char limits).
- **Types**: `LinkedInParseCommand`, `LinkedInParseResultDto`, `ComponentData` variants (BioComponentData, OrderedListComponentData).
- **Props**: `isOpen: boolean`, `onClose: () => void`, `onSuccess: (components: ComponentDto[]) => void`, `sectionId?: string`.

### UrlInput
- **Component description**: Input field for LinkedIn profile URL with parse trigger.
- **Main elements**: Input (Shadcn/ui Input), Parse button (Shadcn/ui Button).
- **Handled interactions**: `onChange` for URL, `onParse` to trigger API.
- **Handled validation**: Regex for LinkedIn URL (`^https://www\.linkedin\.com/in/.*`).
- **Types**: `string` for URL.
- **Props**: `url: string`, `onUrlChange: (url: string) => void`, `onParse: () => void`, `isParsing: boolean`.

### EditableForm
- **Component description**: Form for editing parsed LinkedIn data, generating preview components.
- **Main elements**: Form sections for name/headline (inputs), experience list (repeatable fields), preview of Bio/List components.
- **Handled interactions**: Input changes (auto-save to state), add/remove experience items.
- **Handled validation**: Char limits (headline <=120, about <=2000); required fields.
- **Types**: `LinkedInProfile`, mapped to `BioComponentData` and `OrderedListComponentData`.
- **Props**: `parsedData: LinkedInProfile | null`, `onDataChange: (data: LinkedInProfile) => void`, `isEditing: boolean`.

## 5. Types
All types leverage existing definitions from `src/types.ts`. New ViewModel types:

- `OnboardingState`:
  - `step: 1 | 2` (current step)
  - `username: string` (input value)
  - `isUsernameAvailable: boolean | null` (availability status)
  - `isUsernameLoading: boolean` (API call in progress)
  - `selectedOption: 'github' | 'linkedin' | 'blank' | null`
  - `githubRepos: GitHubRepoDto[]` (fetched repos)
  - `selectedRepos: string[]` (selected repo URLs)
  - `isGenerating: boolean`
  - `generatedComponents: ComponentDto[] | null`
  - `linkedinUrl: string`
  - `isParsing: boolean`
  - `parsedProfile: LinkedInProfile | null`
  - `editedProfile: LinkedInProfile` (mutable copy)
  - `isImporting: boolean`
  - `importedComponents: ComponentDto[] | null`
  - `error: string | null` (general error message)

- `QuickStartOption`:
  - `id: 'github' | 'linkedin' | 'blank'`
  - `icon: React.ComponentType<{ className?: string }>`
  - `title: string`
  - `description: string`
  - `action: () => void` (handler for selection)

- `RepoItemProps`:
  - `repo: GitHubRepoDto`
  - `isSelected: boolean`
  - `onToggle: () => void`

No new DTOs needed; reuse `AuthSessionDto`, `UsernameAvailabilityDto`, `ClaimUsernameCommand`, `GitHubRepoDto`, `GenerateProjectCardsCommand`, `GenerateProjectCardsResultDto`, `LinkedInParseCommand`, `LinkedInParseResultDto`, `CreatePortfolioCommand`.

## 6. State Management
State is managed locally within `OnboardingView` using `useState` for `OnboardingState` fields. A custom hook `useOnboarding` encapsulates API calls (e.g., `checkUsernameAvailability`, `claimUsername`, `fetchGitHubRepos`, `generateProjectCards`, `parseLinkedIn`, `createPortfolio`). Uses `useEffect` for debounced availability checks and session polling. For modals, state drives open/close via `isOpen` props. React Query or SWR could be integrated for caching API responses (e.g., repos list), but for MVP, use `useSWR` for real-time username checks. Global auth state via Supabase context.

## 7. API Integration
- **Username Availability**: GET `/api/v1/auth/username-availability?username={username}` → Response: `ApiSuccessResponse<UsernameAvailabilityDto>`. Trigger on input change (debounced 500ms).
- **Claim Username**: POST `/api/v1/auth/claim-username` with `ClaimUsernameCommand` → Response: `ApiSuccessResponse<UserProfileDto>`. On submit if available.
- **Fetch GitHub Repos**: GET `/api/v1/imports/github/repos` (with optional query params for search/pagination) → Response: `ApiSuccessResponse<{ data: GitHubRepoDto[], meta: PaginationMeta }>`.
- **Generate Project Cards**: POST `/api/v1/imports/github/generate-project-cards` with `GenerateProjectCardsCommand` (section_id optional, auto-create if needed) → Response: `ApiSuccessResponse<GenerateProjectCardsResultDto>`.
- **Parse LinkedIn**: POST `/api/v1/imports/linkedin/parse` with `LinkedInParseCommand` (create_components: false initially) → Response: `ApiSuccessResponse<LinkedInParseResultDto>`.
- **Import LinkedIn (second call)**: POST same endpoint with `create_components: true`, `section_id` → Same response.
- **Create Portfolio**: POST `/api/v1/portfolios` with `CreatePortfolioCommand` (title/description defaults) → Response: `ApiSuccessResponse<PortfolioDto>`. Called on quick-start completion.
All requests use `fetch` with Supabase JWT from session; handle `ApiErrorResponse` for errors.

## 8. User Interactions
- **Username Input**: Typing triggers real-time availability check; green badge if available, red if taken/invalid; subdomain preview updates dynamically.
- **Submit Username**: Validates availability, claims via API, advances to Step 2 on success; error toast on failure.
- **Quick-Start Selection**:
  - GitHub Card Click: Opens GitHubImportModal; select 3-10 repos, generate → Success closes modal, creates portfolio/section/components, redirects to dashboard.
  - LinkedIn Card Click: Opens LinkedInImportModal; paste URL, parse → Edit fields → Select section (or auto), import → Success handling as above.
  - Blank Card Click: Creates empty portfolio, redirects to dashboard.
- **Repo Selection**: Search filters list; checkboxes toggle selection; warning if <3 or >10.
- **Generate Button**: Disables during API call; shows progress bar; on success, shows preview pane with generated cards.
- **URL Parse**: Validates URL, calls API; on success, populates editable form with parsed data.
- **Edit Parsed Data**: Real-time updates to preview components; char counters for limits.
- **Import Button**: Calls API with edited data; handles section creation if needed.
- **Navigation**: Back button in modals; keyboard support (Tab, Enter); ARIA-live for status updates.
- **Completion**: All paths end with portfolio creation and redirect to `/dashboard`.

## 9. Conditions and Validation
- **UsernameStep**: Regex validation on input (`^[a-z0-9-]{3,30}$`); API availability check (must be `true` to enable submit); affects button disabled state and status color.
- **QuickStartStep**: Requires `selectedOption` non-null to enable Next; for imports, modal must complete successfully (components created).
- **GitHubImportModal**: Selection count 3-10 (enables Generate); API validates limits, component total <=15; UI shows count badge and warning toast if exceeded.
- **LinkedInImportModal**: URL format validation; parsed data required fields filled; char limits enforced with input maxLength; preview updates on edit; import disabled if invalid.
- **General**: Post-import, check portfolio min requirements (1 section, 1 component) before publish (but handled in dashboard); toasts for limit exceedance (10 sections, 15 components globally).
- **API Conditions**: All validations mirror backend (e.g., 409 for limits); frontend pre-validates to prevent invalid calls.
Components like buttons disable on invalid states; loaders show during API calls.

## 10. Error Handling
- **API Errors**: Parse `ApiErrorResponse`; show toasts via Shadcn/ui Toast (e.g., "Username taken" for 409, "Rate limited" for 429 with retry button); generic "Something went wrong" for 500.
- **Validation Errors**: Inline messages under inputs (red text via Shadcn/ui FormMessage); prevent submissions.
- **Network/Timeout**: Use `fetch` abort signals; show offline toast, retry on reconnect.
- **Auth Errors**: If session expires (401), redirect to login; poll session in useEffect.
- **Import-Specific**: GitHub: Token invalid → Prompt re-auth; rate limit → Exponential backoff retry. LinkedIn: Parse fail (AI error) → Editable fallback or retry; invalid URL → Inline error.
- **Edge Cases**: Username already claimed → Skip to Step 2 or dashboard. No repos → Disable GitHub option or show message. Empty parse → Allow manual entry.
- **Accessibility**: ARIA-live for errors; focus management on modals (trap focus).
- **Logging**: Use `POST /api/v1/errors` for client errors with context.

## 11. Implementation Steps
1. Set up routing: Add `/onboarding` route in Astro, protected by auth middleware; use React island for interactive parts.
2. Create shared types: Extend `src/types.ts` if needed, but use existing; define `OnboardingState` and option types in view file.
3. Implement StepIndicator and UsernameStep: Build form with debounced `useSWR` for availability; integrate Supabase session.
4. Implement QuickStartStep and OptionCards: Render cards; wire click handlers to open modals or proceed.
5. Build GitHubImportModal: Fetch repos on open; implement search/filter with `useState`; handle generation with progress.
6. Build LinkedInImportModal: URL validation; API parse call; editable form using Shadcn/ui Form with Zod schema for validation.
7. Integrate state management: Create `useOnboarding` hook with all API wrappers; manage step transitions.
8. Add API integrations: Use `fetch` with auth headers; handle responses/errors uniformly.
9. Implement user interactions: Add event handlers, toasts, loaders; ensure keyboard/ARIA compliance.
10. Add validations and conditions: Inline checks, button states; pre-API validations.
11. Handle errors: Implement toast notifications, logging; test edge cases.
12. Style with Tailwind/Shadcn: Ensure responsive design (mobile stacked); test UX flow.
13. Test: Unit tests for hooks/components; E2E for flows (Cypress); verify against user stories.
14. Integrate with dashboard: On completion, create portfolio/section if needed, redirect via `navigate`.
