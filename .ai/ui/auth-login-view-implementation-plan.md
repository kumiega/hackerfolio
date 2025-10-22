# View Implementation Plan: Auth/Login View

## 1. Overview
The Auth/Login View serves as the entry point for user authentication, primarily handling GitHub OAuth login. It provides a simple, secure interface for users to initiate the login process, redirecting them to GitHub for authorization and handling the callback to establish a session in the application. This view aligns with the MVP's focus on quick onboarding for developers building their portfolios.

## 2. View Routing
The view should be accessible at the path `/login`. This route will be defined in the Astro routing system under `src/pages/login.astro`, ensuring it renders as a full-page view without layout wrapping if it's a standalone auth page, or integrated into the main layout if needed for consistency.

## 3. Component Structure
- LoginView (Main Astro page component)
  - LoginForm (React island for interactive login button and error handling)
    - GitHubLoginButton (Shadcn/ui-based button component)
    - ErrorMessage (Display component for auth errors)

The structure keeps the page mostly static with React islands for dynamic elements like the login button interaction and session checks.

## 4. Component Details
### LoginView
- Component description: The root Astro component that renders the login page, including a hero section with branding and the login form. It consists of a centered layout with the login button and any error messages.
- Main elements: `<div class="min-h-screen flex items-center justify-center">` containing a card with heading "Welcome to Hackerfolio" and the child LoginForm React component.
- Handled interactions: None directly; delegates to LoginForm for button clicks.
- Handled validation: Ensures the page only shows if user is not authenticated; redirects if session exists.
- Types: Uses `AuthSessionDto` from types.ts for session checks.
- Props: None, as it's the root page component.

### LoginForm
- Component description: A React component handling the GitHub login initiation and error display. It uses Supabase client to start the OAuth flow and manages loading/error states.
- Main elements: `<form>` wrapper (for accessibility), GitHubLoginButton, and conditional ErrorMessage.
- Handled interactions: Click on GitHubLoginButton triggers `supabase.auth.signInWithOAuth`.
- Handled validation: Validates that the OAuth provider is correctly configured; checks for session on mount to redirect if logged in.
- Types: `AuthSessionDto`, custom `LoginError` type for error states.
- Props: `onLoginSuccess?: () => void` (optional callback), `initialError?: string`.

### GitHubLoginButton
- Component description: A styled button using Shadcn/ui's button component, displaying "Login with GitHub" icon and text.
- Main elements: `<Button variant="outline" size="lg">` with GitHub icon from lucide-react.
- Handled interactions: onClick handler passed from parent to initiate OAuth.
- Handled validation: Disabled during loading state.
- Types: None specific; uses standard React props.
- Props: `onClick: () => void`, `isLoading: boolean`, `disabled?: boolean`.

### ErrorMessage
- Component description: Displays user-friendly error messages for failed login attempts.
- Main elements: `<Alert variant="destructive">` from Shadcn/ui with icon and message text.
- Handled interactions: None; passive display.
- Handled validation: Only renders if error state is present.
- Types: `LoginError` interface.
- Props: `error: LoginError | null`, `onDismiss?: () => void`.

## 5. Types
The view leverages existing types from `src/types.ts` and introduces minimal new types for view-specific state:

- Existing Types:
  - `AuthSessionDto`: Interface for the current auth session, including `user` (id, email) and `profile` (id, username, created_at). Used for checking if user is logged in and redirecting accordingly.
  - `ApiErrorResponse`: For handling API errors during session fetch, with fields `error.code`, `error.message`, `error.details`, `error.requestId`.

- New ViewModel Types:
  - `LoginState`: 
    - `isLoading: boolean` - Indicates if the OAuth flow is in progress.
    - `error: LoginError | null` - Current error state.
    - `session: AuthSessionDto | null` - Current user session.
  - `LoginError`:
    - `code: string` - Error code from Supabase (e.g., 'OAuth provider error').
    - `message: string` - User-friendly message (e.g., 'Failed to connect to GitHub. Please try again.').
    - `details?: string` - Additional technical details for debugging, not shown to user.
  These types ensure type-safe state management in the React components, with `LoginError` extending Supabase error formats for consistency.

## 6. State Management
State is managed locally within the LoginForm React component using React's `useState` and `useEffect` hooks, integrated with the Supabase client via `@supabase/supabase-js`. No global state (e.g., Redux/Zustand) is required for this simple view, as it's isolated to authentication.

- Custom Hook: `useAuth` - A composable hook that:
  - Initializes Supabase client.
  - Fetches current session on mount using `supabase.auth.getSession()`.
  - Listens to auth state changes with `supabase.auth.onAuthStateChange()`.
  - Provides functions: `handleGitHubLogin()` to initiate OAuth, `clearError()` to dismiss messages.
  - Returns: `{ isLoading, error, session, handleGitHubLogin, clearError }`.
This hook encapsulates Supabase logic, making the component focused on UI rendering and promoting reusability.

## 7. API Integration
Integration uses the Supabase JavaScript client (`@supabase/supabase-js`) directly in the browser, as per the endpoint implementation. No custom API endpoints are needed for login initiation.

- Request: `supabase.auth.signInWithOAuth({ provider: 'github' })` - Initiates redirect to GitHub OAuth; no request body, returns a Promise that resolves post-redirect (handled by Supabase callback).
- Response: On success, Supabase sets session in local storage and redirects to `/` (or app root). On callback, `supabase.auth.getSession()` returns `AuthSessionDto`-like data: `{ data: { session: { user, access_token } }, error: null }`.
- Post-login: Call `GET /auth/session` (Supabase endpoint) to fetch full `AuthSessionDto` including profile, returning `ApiSuccessResponse<AuthSessionDto>`.
Error responses use `ApiErrorResponse` format if fetching session fails.

## 8. User Interactions
- **Click "Login with GitHub" Button**:
  - Button enters loading state (spinner, disabled).
  - Calls `handleGitHubLogin()`, redirecting to GitHub authorization page.
  - On success (post-redirect), app checks session and navigates to dashboard or onboarding (`/onboarding` if no username).
  - On failure (e.g., user cancels), returns to login with error message: "Login cancelled. Please try again."
- **Error Display and Dismiss**:
  - If error occurs (e.g., network issue), shows ErrorMessage with ARIA live region for screen readers.
  - User can retry by clicking the button again, which clears the error.
- **Auto-redirect on Existing Session**:
  - On page load, if session exists, immediately redirects to app root without user action.
- All interactions include focus management: Button receives focus on load, errors announce via `aria-live="polite"`.

## 9. Conditions and Validation
- **Authentication Check**: On mount, verify `session` from `supabase.auth.getSession()`. If present and valid (non-null user), redirect to `/`. Affects interface by not rendering the form.
- **OAuth Provider Validation**: Ensure GitHub provider is enabled in Supabase config (assumed pre-setup). Component-level: Disable button if Supabase client not initialized.
- **Error State Validation**: Errors trigger UI update only if `error` is non-null; validate message length for display (truncate if >200 chars).
- **Accessibility Conditions**: Form must have `role="form"`, buttons `aria-label` for icons, and live regions for dynamic errors. Verified by rendering only accessible elements.
These conditions prevent invalid states, ensuring the view only shows when unauthenticated.

## 10. Error Handling
- **OAuth Errors**: Catch Supabase errors (e.g., 'Provider_not_supported', network timeouts) in `handleGitHubLogin()`, set `LoginError` with user-friendly message, and display via ErrorMessage. Retry allowed; log to console for dev.
- **Session Fetch Errors**: If `getSession()` fails, treat as unauthenticated but show generic error: "Unable to check session. Please refresh."
- **Redirect Failures**: If callback URL mismatch, Supabase returns error; handle by clearing session and showing "Invalid login attempt. Please try again."
- **Edge Cases**: No internet - show offline message; Invalid GitHub account - propagate Supabase message. Use try-catch in hooks, with fallback to default error state.
- Security: Never display sensitive details (e.g., tokens); validate redirects to prevent open redirect attacks (Supabase handles).

## 11. Implementation Steps
1. Set up the page: Create `src/pages/login.astro` with basic layout using Tailwind classes for centering.
2. Install dependencies: Ensure `@supabase/supabase-js`, `lucide-react` (for icons), and Shadcn/ui button/alert are available.
3. Create React components: Implement `LoginForm.tsx`, `GitHubLoginButton.tsx`, `ErrorMessage.tsx` in `src/components/auth/`.
4. Develop custom hook: Write `useAuth` in `src/hooks/useAuth.ts`, integrating Supabase client initialization from env vars.
5. Integrate Supabase: Configure client with `SUPABASE_URL` and `SUPABASE_ANON_KEY`; set OAuth redirect to `/auth/callback`.
6. Add types: Extend `src/types.ts` if needed, but use existing `AuthSessionDto`; define `LoginState` and `LoginError` locally in component files.
7. Handle routing: Use Astro's `Astro.redirect()` for session-based redirects; for client-side, use React Router or `window.location.href`.
8. Add UX polish: Implement loading spinner, focus management with `useEffect`, ARIA attributes.
9. Test interactions: Manually test OAuth flow, error injection (mock Supabase errors), accessibility with screen readers.
10. Lint and validate: Run linters, ensure TypeScript compliance, and check against US-001 criteria.
