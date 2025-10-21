# Preview View Implementation Plan

## 1. Overview
The Preview View is a read-only display of the user's current portfolio state, rendered in a new tab for review before publishing. It mimics the public portfolio view, showing sections and components in sequence to allow users to preview how their portfolio will appear publicly. This view is accessible via `/preview/{username}` and uses SSR for rendering, ensuring it reflects the latest unpublished changes.

## 2. View Routing
The view should be accessible at the path `/preview/[username]`, where `[username]` is a dynamic route parameter representing the user's username. This route will be implemented as an Astro page that fetches data server-side and renders the portfolio preview. Post-publish, the same structure supports public access at `{username}.hackerfolio.test`.

## 3. Component Structure
- PreviewPage (top-level Astro page)
  - PortfolioHeader (renders portfolio title and description)
    - HeroSection (if applicable for bio/headline)
  - SectionsContainer (maps over sections)
    - Section (renders section name as header if visible)
      - ComponentsList (maps over components in order)
        - TextRenderer
        - ProjectCardRenderer
        - TechPillsRenderer
        - SocialLinksRenderer
        - LinkListRenderer
        - ImageRenderer
        - BioRenderer
        - OrderedListRenderer
  - Footer (optional static footer mirroring landing page)

The structure is hierarchical: the page fetches data, renders header, iterates sections, and within each, iterates components based on type.

## 4. Component Details
### PreviewPage
- Component description: The main entry point for the preview view, responsible for server-side data fetching using the SSR endpoint, handling routing params, and rendering the overall layout. It ensures the view is read-only and responsive.
- Main elements: `<main>` wrapper with full-width container, child PortfolioHeader and SectionsContainer; uses Astro's `<slot>` if needed for islands, but primarily static SSR.
- Handled interactions: None (read-only); potential client-side hydration for minor interactions like lazy-loading images if using React islands.
- Handled validation: Verify portfolio exists and user has access (via username); check if published or preview mode; ensure at least one visible section/component for meaningful preview.
- Types: PublicPortfolioDto (from types.ts), with potential custom PreviewViewModel extending it for preview-specific flags like 'isPreview' boolean.
- Props: username (string from params), isPreview (boolean, default true for internal preview).

### PortfolioHeader
- Component description: Displays the portfolio's title and description at the top, similar to a hero section, to set the context for the preview.
- Main elements: `<header>` with `<h1>` for title, `<p>` for description; styled with Tailwind for responsiveness.
- Handled interactions: None.
- Handled validation: Title must not be empty if present; description optional.
- Types: PortfolioDto (title, description).
- Props: portfolio (PublicPortfolioDto['portfolio']).

### SectionsContainer
- Component description: Iterates over sections in order, rendering only visible ones, to build the sequential flow of the portfolio.
- Main elements: `<div class="sections">` mapping to Section components; uses CSS Grid or Flex for responsive stacking on mobile.
- Handled interactions: None.
- Handled validation: Sections ordered by position; skip invisible sections; enforce max 10 sections implicitly via data.
- Types: PublicSectionDto[].
- Props: sections (PublicSectionDto[]).

### Section
- Component description: Renders a single section, showing its name as a header if visible, followed by its components.
- Main elements: `<section>` with `<h2>` for name (if visible), child ComponentsList.
- Handled interactions: None.
- Handled validation: Position for ordering; visible flag to conditionally render.
- Types: PublicSectionDto.
- Props: section (PublicSectionDto).

### ComponentsList
- Component description: Maps over components in a section, dispatching to type-specific renderers based on component type.
- Main elements: `<div class="components">` with conditional rendering via switch on type.
- Handled interactions: None.
- Handled validation: Components ordered by position; total across portfolio <=15; type-specific data validation assumed from backend.
- Types: ComponentDto[].
- Props: components (ComponentDto[]).

### TextRenderer (and similar type-specific renderers)
- Component description: Renders text content safely, e.g., as paragraphs or rich text if formatted.
- Main elements: `<div class="text-content">` with sanitized HTML or plain text.
- Handled interactions: None.
- Handled validation: Content <=2000 chars; escape HTML to prevent XSS.
- Types: ComponentDataByType<'text'> (TextComponentData).
- Props: component (ComponentDto & { data: TextComponentData }).

*(Similar details for other renderers: ProjectCardRenderer uses links and tech badges; TechPillsRenderer as badge list; SocialLinksRenderer as icon links; LinkListRenderer as bulleted/numbered list; ImageRenderer with `<img>` and alt; BioRenderer as profile summary; OrderedListRenderer as structured list.)*

## 5. Types
Utilize existing DTOs from src/types.ts:
- PublicPortfolioDto: { username: string; portfolio: { title: string; description: string | null; published_at: string | null; }; sections: PublicSectionDto[]; }
- PublicSectionDto: Omit<Tables<"sections">, "portfolio_id" | "created_at" | "updated_at"> & { components: ComponentDto[]; }
- ComponentDto: Omit<Tables<"components">, "section_id" | "created_at" | "updated_at">;
- ComponentDataByType<T extends ComponentType>: Maps type to specific data (e.g., TextComponentData { content: string; }).

New ViewModel types:
- PreviewViewModel: Extends PublicPortfolioDto with { isPreview: boolean; previewTimestamp?: string; } – 'isPreview' flags internal preview vs public; 'previewTimestamp' for cache-busting in preview mode.
- RendererProps<T extends ComponentType>: { component: ComponentDto & { data: ComponentDataByType<T>; }; } – Typed props for each renderer to ensure type safety.

All types align with TypeScript 5 strict mode; use discriminated unions for ComponentData.

## 6. State Management
The Preview View is primarily SSR with minimal client-side state, as it's read-only. No global state management (e.g., Zustand or Redux) needed. Use React local state if hydrating islands for lazy-loading (e.g., useState for loaded images). Custom hook: usePreviewData() – fetches or uses server-fetched data, returns { portfolio: PreviewViewModel, loading: boolean, error: string | null }. Purpose: Encapsulate data fetching logic for reuse in client-side re-renders, but primarily server-side in Astro.

## 7. API Integration
Integrate with GET `/api/v1/ssr/portfolios/:username` (server-side only, using service role key).
- Request: No body; path param 'username'; headers include Supabase service role for auth bypass in preview.
- Response type: ApiSuccessResponse<PublicPortfolioDto> or ApiErrorResponse.
- In Astro page: Use server-side fetch with { method: 'GET', headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` } }; handle 200 to get PublicPortfolioDto, transform to PreviewViewModel if isPreview=true (e.g., via query param ?preview=true).
- For public post-publish: Same endpoint, but validate is_published=true; client-accessible without service role if RLS allows public read.

## 8. User Interactions
- Opening Preview: From dashboard, click "Preview" button → window.open(`/preview/${username}?preview=true`, '_blank'); Expected: New tab loads SSR-rendered portfolio.
- Navigation: User scrolls through sections/components; responsive resize on mobile.
- No edits: All elements read-only; no forms or buttons except potential "Back to Dashboard" link.
- Public Access: Post-publish, direct URL access → Loads without auth, shows published state.

## 9. Conditions and Validation
- API Conditions: Portfolio must exist (404 if not); for preview, allow unpublished (is_published=false); for public, require is_published=true (403 if not). Verify min 1 visible section/component via backend validation on publish, but frontend checks for empty state message.
- Component Level: In PreviewPage, if sections.length === 0, show "No content to preview – add sections in dashboard."; For each Section, if !visible, skip render; Components: Validate data types (e.g., image url valid) – assume backend-validated, but add fallbacks (e.g., broken image placeholder).
- Interface State: Loading spinner during SSR fetch; error banner if fetch fails, linking back to dashboard.

## 10. Error Handling
- 404 Not Found: Display "Portfolio not found or not published." with link to landing.
- 403 Forbidden: For unpublished public access, show "This portfolio is private."; For preview, shouldn't occur.
- Network/Fetch Errors: Show generic "Unable to load preview. Please try again." with retry button (refetch).
- Data Validation Errors: If malformed component data (e.g., invalid URL), render gracefully (e.g., plain text for links, placeholder for images).
- Edge Cases: Empty portfolio → Informational message; Exceeded limits → Shouldn't reach preview if backend enforces, but show warning if detected.
- Use toasts or inline messages with shadcn/ui Alert components; log errors to console or /api/v1/errors endpoint.

## 11. Implementation Steps
1. Create new Astro page at `src/pages/preview/[username].astro`: Set up dynamic route, server-side fetch to `/api/v1/ssr/portfolios/${Astro.params.username}` using service role.
2. Handle query param ?preview=true to set isPreview flag; parse response into PreviewViewModel.
3. Implement error handling: If 404/403, render error page with message; else, pass data to layout.
4. Build PortfolioHeader component (Astro or React island): Render title/description with Tailwind styles.
5. Create SectionsContainer: Loop over sections, filter visible, render Section for each.
6. Implement Section: Conditional h2 for name, then ComponentsList.
7. Develop ComponentsList: Switch on component.type, render specific renderer (e.g., TextRenderer as <div>{data.content}</div>).
8. Create type-specific renderers as separate .astro or .tsx files: Ensure responsive (Tailwind classes like md:grid), accessible (aria-labels, alt texts).
9. Add global styles: Full-width layout, sans-serif font, mimic public theme.
10. Test SSR: Build and preview locally; verify new tab opens correctly from dashboard (assume dashboard button exists).
11. Accessibility: Add semantic tags (<section>, <article> for components), keyboard navigation if any.
12. Optimize: Lazy-load images in ImageRenderer; minify for production.
13. Integrate with dashboard: Ensure button in dashboard links to this route.
