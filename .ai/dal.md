# Data Access Layer (DAL) Documentation

## Overview

The Data Access Layer (DAL) is a lightweight abstraction that provides simple, view-focused data access methods without business logic. It ensures that all data access in views goes through a clean, consistent interface.

## Key Principles

- **No Business Logic**: DAL methods only retrieve and transform data, never implement business rules
- **View-Focused**: Methods return exactly what views need, formatted for display
- **Consistent Error Handling**: All methods handle errors gracefully and return appropriate defaults
- **Type-Safe Operations**: Full TypeScript support with proper return types

## Architecture

```
Views (Astro Pages) → DAL → Repositories → Database
```

The DAL sits between your views and the repository layer, providing a simplified interface for common data access patterns.

## Usage Guidelines

### ✅ DO Use DAL For:

- **View Data Access**: Any data needed for rendering pages/components
- **Simple Queries**: Basic CRUD operations for display purposes
- **Data Transformation**: Converting database models to view-friendly formats
- **Error Handling**: Graceful fallbacks when data is not available

### ❌ DON'T Use DAL For:

- **Business Logic**: Complex operations, validations, or calculations
- **API Endpoints**: Use Services for API routes (they have more complex logic)
- **Complex Queries**: Multi-table joins with business rules
- **Data Modification**: Create/Update/Delete operations (use Services)

## Available DAL Classes

### UserProfileDAL

Handles user profile data access for views.

```typescript
import { UserProfileDAL } from "@/lib/dal";

// Check if user has username (for onboarding)
const hasUsername = await UserProfileDAL.hasUsername(supabase, userId);

// Get profile for display
const profile = await UserProfileDAL.getProfileForDisplay(supabase, userId);

// Check username availability
const isAvailable = await UserProfileDAL.isUsernameAvailable(supabase, username);

// Get all profiles (debugging)
const profiles = await UserProfileDAL.getAllProfiles(supabase);
```

### PortfolioDAL

Handles portfolio data access for views.

```typescript
import { PortfolioDAL } from "@/lib/dal";

// Get user's portfolio for dashboard
const portfolio = await PortfolioDAL.getUserPortfolio(supabase, userId);

// Get public portfolio by username (SSR)
const publicPortfolio = await PortfolioDAL.getPublicPortfolioByUsername(supabase, username);
```

### AuthDAL

Handles authentication data access for views.

```typescript
import { AuthDAL } from "@/lib/dal";

// Get current session for views
const session = await AuthDAL.getCurrentSession(supabase);
```

### SectionDAL

Handles section data access for views.

```typescript
import { SectionDAL } from "@/lib/dal";

// Get sections for a portfolio
const sections = await SectionDAL.getPortfolioSections(supabase, portfolioId);
```

### ComponentDAL

Handles component data access for views.

```typescript
import { ComponentDAL } from "@/lib/dal";

// Get components for a section
const components = await ComponentDAL.getSectionComponents(supabase, sectionId);
```

## Example Usage in Astro Pages

### Before (Direct Database Queries)
```astro
---
// ❌ DON'T: Direct database queries in views
const { data: profile } = await Astro.locals.supabase
  .from("user_profiles")
  .select("username")
  .eq("id", sessionData.user.id)
  .single();

if (profile?.username) {
  return Astro.redirect("/dashboard");
}
---
```

### After (Using DAL)
```astro
---
// ✅ DO: Use DAL for data access
import { UserProfileDAL } from "@/lib/dal";

const hasUsername = await UserProfileDAL.hasUsername(Astro.locals.supabase, sessionData.user.id);

if (hasUsername) {
  return Astro.redirect("/dashboard");
}
---
```

## Error Handling

DAL methods handle errors gracefully:

- **Database Errors**: Return `null` or empty arrays instead of throwing
- **Authentication Errors**: Return `null` for session methods
- **Validation Errors**: Return safe defaults (e.g., `false` for availability checks)

```typescript
// DAL handles errors internally
const profile = await UserProfileDAL.getProfileForDisplay(supabase, userId);
// profile is either UserProfileDisplay | null, never throws
```

## Type Safety

All DAL methods return strongly-typed interfaces:

```typescript
interface UserProfileDisplay {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface PortfolioDisplay {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}
```

## Migration Guide

### Step 1: Identify Direct Database Queries
Look for patterns like:
```typescript
await supabase.from("table").select("*").eq("id", value)
```

### Step 2: Replace with DAL Methods
```typescript
// Before
const { data } = await supabase.from("user_profiles").select("*").eq("id", userId);

// After
const profile = await UserProfileDAL.getProfileForDisplay(supabase, userId);
```

### Step 3: Update Error Handling
```typescript
// Before
if (error) {
  // Handle error
}

// After
if (!profile) {
  // Handle missing data
}
```

## Best Practices

1. **Always Use DAL in Views**: Never write direct database queries in Astro pages
2. **Keep Methods Simple**: Each DAL method should do one thing well
3. **Return View-Friendly Data**: Format data for display, not storage
4. **Handle Errors Gracefully**: Return safe defaults instead of throwing
5. **Use TypeScript**: Leverage the provided interfaces for type safety

## Adding New DAL Methods

When adding new DAL methods:

1. **Follow Naming Conventions**: Use descriptive names like `getUserProfileForDisplay`
2. **Return View-Friendly Types**: Create interfaces that match what views need
3. **Handle Errors**: Always return safe defaults
4. **Add Documentation**: Include JSDoc comments explaining usage
5. **Update This Guide**: Document new methods in this file

Example:
```typescript
/**
 * Get user's recent activity for dashboard display
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @returns Promise<ActivityDisplay[]> - Array of recent activities
 */
static async getRecentActivity(supabase: SupabaseClient, userId: string): Promise<ActivityDisplay[]> {
  try {
    const activities = await repositories.activities.findRecentByUserId(userId);
    return activities.map(activity => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      created_at: activity.created_at,
    }));
  } catch (error) {
    if (error instanceof AppError && error.code === 'DATABASE_ERROR') {
      return [];
    }
    throw error;
  }
}
```

## Summary

The DAL provides a clean separation between views and data access, ensuring:

- **No Business Logic in Views**: Views focus on presentation
- **Consistent Data Access**: All views use the same patterns
- **Better Error Handling**: Graceful fallbacks for missing data
- **Type Safety**: Strong typing for all data operations
- **Maintainability**: Centralized data access logic

Use the DAL for all view data access needs, and keep business logic in the Service layer.
