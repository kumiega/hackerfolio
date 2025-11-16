# Client-Side Session Checking Guide

This guide shows you how to check for user sessions on the client side in your Hackerfolio application.

## Available Methods

### 1. SessionUtils Class (`src/lib/session-utils.ts`)

Direct utility functions for programmatic session checks:

```typescript
import { SessionUtils } from "@/lib/session-utils";

// Check if user has an active session
const hasSession = await SessionUtils.hasSession();

// Get full session data
const session = await SessionUtils.getCurrentSession();

// Get just the user ID
const userId = await SessionUtils.getCurrentUserId();

// Get just the user email
const email = await SessionUtils.getCurrentUserEmail();

// Wait for auth state to be determined (useful for initial page loads)
const session = await SessionUtils.waitForAuth();
```

### 2. React Hooks (`src/hooks/useSessionCheck.ts`)

#### useSessionCheck Hook
Full-featured hook with session data and loading states:

```tsx
import { useSessionCheck } from "@/hooks/useSessionCheck";

function MyComponent() {
  const { session, isLoading, isAuthenticated, userId, userEmail } = useSessionCheck();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {userEmail}!</p>
      ) : (
        <p>Please log in</p>
      )}
    </div>
  );
}
```

#### useIsAuthenticated Hook
Simple boolean check for authentication status:

```tsx
import { useIsAuthenticated } from "@/hooks/useSessionCheck";

function MyComponent() {
  const isAuthenticated = useIsAuthenticated();

  if (isAuthenticated === null) return <div>Loading...</div>;

  return (
    <div>
      {isAuthenticated ? "You're logged in!" : "Please log in"}
    </div>
  );
}
```

### 3. AuthGuard Components (`src/components/auth/AuthGuard.tsx`)

Conditional rendering based on authentication state:

```tsx
import { AuthenticatedOnly, UnauthenticatedOnly, AuthGuard } from "@/components/auth/AuthGuard";

// Only show content to authenticated users
<AuthenticatedOnly>
  <p>This is only visible to logged-in users</p>
</AuthenticatedOnly>

// Only show content to unauthenticated users
<UnauthenticatedOnly>
  <p>This is only visible to guests</p>
</UnauthenticatedOnly>

// Custom auth guard with fallback
<AuthGuard requireAuth={true} fallback={<div>Please log in</div>}>
  <p>Protected content</p>
</AuthGuard>
```

## Usage Examples

### 1. Navigation Component
See `src/components/navigation/DynamicNav.tsx` for a complete example of dynamic navigation based on auth state.

### 2. Landing Page
See `src/pages/index.astro` for how to show different content based on authentication state.

### 3. Dashboard Protection
```tsx
// In a React component
function ProtectedDashboard() {
  const { isAuthenticated, isLoading } = useSessionCheck();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in</div>;

  return <div>Dashboard content</div>;
}
```

### 4. API Calls with Session
```tsx
function MyComponent() {
  const { userId } = useSessionCheck();

  const fetchUserData = async () => {
    if (!userId) {
      return;
    }

    // Make authenticated API call
    const response = await fetch(`/api/user/${userId}`);
    // ...
  };

  return <button onClick={fetchUserData}>Load Data</button>;
}
```

## Best Practices

1. **Always handle loading states** - Authentication checks are asynchronous
2. **Use appropriate hooks** - `useSessionCheck` for full data, `useIsAuthenticated` for simple checks
3. **Implement fallbacks** - Show appropriate content when users aren't authenticated
4. **Handle errors gracefully** - Session checks can fail due to network issues
5. **Use AuthGuard components** - For conditional rendering, they handle loading states automatically

## Integration with Astro

When using these components in Astro pages, remember to add the `client:load` directive:

```astro
---
import DynamicNav from "@/components/navigation/DynamicNav";
import { AuthenticatedOnly } from "@/components/auth/AuthGuard";
---

<DynamicNav client:load />

<AuthenticatedOnly client:load>
  <p>Welcome back!</p>
</AuthenticatedOnly>
```

## Performance Considerations

- `useSessionCheck` provides full session data but has more overhead
- `useIsAuthenticated` is lighter for simple boolean checks
- `SessionUtils` methods are one-time checks, not reactive
- AuthGuard components handle loading states efficiently

## Error Handling

All methods include proper error handling:
- Network failures return `false` or `null`
- Invalid sessions are handled gracefully
- Loading states prevent UI flicker
- Error boundaries can catch unexpected issues
