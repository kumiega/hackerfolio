# View Implementation Plan Public Portfolio View

## 1. Overview
The Public Portfolio View is a server-side rendered (SSR) page designed to publicly display a user's published portfolio on a subdomain like `{username}.hackerfolio.test`. It fetches and renders the portfolio's title, description, and visible sections with their components in a sequential, read-only format. The view emphasizes a clean, professional layout optimized for sharing, with a hero section for the title and description, followed by section headers and component renders. It ensures mobile-first responsiveness, accessibility features like alt texts and semantic HTML, and security by only rendering published portfolios (unpublished ones return a 404).

## 2. View Routing
The view should be accessible via dynamic subdomain routing at `{username}.hackerfolio.test`. In Astro, implement this using the `Astro.url.hostname` to extract the username (e.g., split and validate against `^[a-z0-9-]{3,30}$`). For local development/testing, use `hackerfolio.test` as the base domain with wildcard subdomain support. A preview route `/preview/{username}` can mirror this for unpublished previews, but the public view strictly requires `is_published: true`.

## 3. Component Structure
- PublicPortfolioPage (Astro page component, SSR root)
  - Hero (Astro component, static)
  - SectionsContainer (Astro component, iterates over sections)
    - SectionRenderer (Astro component, per section)
      - SectionHeader (Astro component, simple header)
      - ComponentsContainer (Astro component, iterates over components)
        - ComponentRenderer (Astro component, type-based switch)
          - TextRenderer (Astro component)
          - ProjectCardRenderer (Astro component)
          - TechListRenderer (Astro component, for 'pills')
          - SocialLinksRenderer (Astro component)
          - LinkListRenderer (Astro component, for 'list')
          - ImageRenderer (Astro component)
          - BioRenderer (Astro component)
          - OrderedListRenderer (Astro component)
  - Footer (Astro component, optional static footer with app branding)

No React islands are needed for this view, as it is fully static and read-only post-SSR.

## 4. Component Details
### PublicPortfolioPage
- Component description: The root SSR page that fetches portfolio data server-side, handles 404 for unpublished/not found portfolios, and orchestrates the layout. It consists of a hero, sections container, and footer, using Tailwind for full-width responsive design.
- Main elements: `<main>` wrapper with ARIA landmark `role="main"`, Hero, SectionsContainer, Footer; conditional 404 page if no data.
- Handled events: None (read-only view).
- Handled validation: Server-side verification of `is_published: true` and existence of at least one visible section/component (enforced by API); client-side none, but render nothing if data invalid.
- Types: `PublicPortfolioDto` for fetched data; `Astro` globals for URL parsing.
- Props: None (top-level page).

### Hero
- Component description: Displays the portfolio's title and description in a prominent banner, serving as the entry point to convey the user's professional summary.
- Main elements: `<header>` with `role="banner"`, `<h1>` for title (using Shadcn heading), `<p>` for description; background gradient or subtle Tailwind styling for visual appeal.
- Handled events: None.
- Handled validation: Ensure title is not empty (from API); truncate description if exceeds 2000 chars (though API enforces).
- Types: Props from `PublicPortfolioDto['portfolio']` (title: string, description: string | null).
- Props: `{ portfolio: Pick<PublicPortfolioDto['portfolio'], 'title' | 'description'> }`.

### SectionsContainer
- Component description: A container that maps over visible sections, ensuring sequential rendering with spacing; handles empty state if no sections.
- Main elements: `<section>` or `<div>` with flex/grid layout for stacking sections; iterates SectionRenderer.
- Handled events: None.
- Handled validation: Only render sections where `visible: true`; API ensures at least one if published.
- Types: `PublicSectionDto[]` from `PublicPortfolioDto['sections']`.
- Props: `{ sections: PublicSectionDto[] }`.

### SectionRenderer
- Component description: Renders a single section, including its header and components; uses Tailwind for section padding and borders.
- Main elements: `<section>` with `role="region" aria-labelledby` for header, SectionHeader, ComponentsContainer.
- Handled events: None.
- Handled validation: Skip if `visible: false`; ensure position order is respected (API sorts by `position`).
- Types: `PublicSectionDto` (id, name, position, visible, components: ComponentDto[]).
- Props: `{ section: PublicSectionDto }`.

### SectionHeader
- Component description: Simple header for the section name, providing semantic structure.
- Main elements: `<h2>` using Shadcn heading component, with Tailwind classes for sizing.
- Handled events: None.
- Handled validation: Name <=150 chars (API enforced).
- Types: string for name.
- Props: `{ name: string }`.

### ComponentsContainer
- Component description: Maps over a section's components, rendering each based on type; handles empty components gracefully.
- Main elements: `<div>` with vertical stack layout; iterates ComponentRenderer.
- Handled events: None.
- Handled validation: Only visible components (toggle via section visibility); respect global limits implicitly (API caps at 15).
- Types: `ComponentDto[]` from `PublicSectionDto['components']`.
- Props: `{ components: ComponentDto[] }`.

### ComponentRenderer
- Component description: A switch statement that delegates to type-specific renderers based on `type`; ensures consistent spacing between components.
- Main elements: Conditional rendering of child renderers wrapped in `<article>` or `<div>` for semantics.
- Handled events: None.
- Handled validation: Type must match enum (API enforces); data validation per type (e.g., content length).
- Types: `ComponentDto` (id, type: ComponentType, position, data: ComponentData); uses `ComponentDataByType` for discriminated union.
- Props: `{ component: ComponentDto }`.

### TextRenderer
- Component description: Renders plain text content, suitable for paragraphs or body text.
- Main elements: `<p>` or `<div>` with Tailwind prose classes for readability.
- Handled events: None.
- Handled validation: Content <=2000 chars; escape HTML if needed (but API stores plain text).
- Types: `ComponentDataByType<'text'>` (TextComponentData: { content: string }).
- Props: `{ data: TextComponentData }`.

### ProjectCardRenderer
- Component description: Displays a project card with title, summary, tech pills, and repo link.
- Main elements: Card from Shadcn/ui, `<h3>` title, `<p>` summary, `<ul>` for tech (pills), link to repo_url.
- Handled events: None (link is external).
- Handled validation: Title <=100 chars, summary <=500, tech array <= items from API.
- Types: `ComponentDataByType<'card'>` (ProjectCardComponentData: { repo_url: string, title: string, summary: string, tech: string[] }).
- Props: `{ data: ProjectCardComponentData }`.

### TechListRenderer
- Component description: Renders a list of tech stacks as pills or badges.
- Main elements: `<ul>` with Shadcn badge components for each item.
- Handled events: None.
- Handled validation: <=30 items, each <=20 chars.
- Types: `ComponentDataByType<'pills'>` (TechListComponentData: { items: string[] }).
- Props: `{ data: TechListComponentData }`.

### SocialLinksRenderer
- Component description: Displays social media icons/links (GitHub, LinkedIn, X, websites).
- Main elements: `<ul>` horizontal list with Shadcn buttons or icons linking to URLs.
- Handled events: None.
- Handled validation: URLs valid (API enforces); optional fields.
- Types: `ComponentDataByType<'social_links'>` (SocialLinksComponentData: { github?: string, linkedin?: string, x?: string, website?: { name: string, url: string }[] }).
- Props: `{ data: SocialLinksComponentData }`.

### LinkListRenderer
- Component description: Renders a list of links with labels.
- Main elements: `<ul>` with `<li><a>` for each item.
- Handled events: None.
- Handled validation: Label <=80 chars, valid URLs.
- Types: `ComponentDataByType<'list'>` (LinkListComponentData: { items: { label: string, url: string }[] }).
- Props: `{ data: LinkListComponentData }`.

### ImageRenderer
- Component description: Displays an image with alt text for accessibility.
- Main elements: `<img>` with `loading="lazy"`, Tailwind responsive classes; fallback if URL invalid.
- Handled events: None.
- Handled validation: URL valid, alt <=120 chars, size <=2MB (API enforced, but check src).
- Types: `ComponentDataByType<'image'>` (ImageComponentData: { url: string, alt: string, maxImageSizeMB?: number }).
- Props: `{ data: ImageComponentData }`.

### BioRenderer
- Component description: Renders a bio with headline and about section.
- Main elements: `<h3>` headline, `<p>` about.
- Handled events: None.
- Handled validation: Headline <=120 chars, about <=2000.
- Types: `ComponentDataByType<'bio'>` (BioComponentData: { headline: string, about: string }).
- Props: `{ data: BioComponentData }`.

### OrderedListRenderer
- Component description: Renders an ordered list of items (e.g., experience).
- Main elements: `<ol>` with `<li>` for each item, displaying label and optional value.
- Handled events: None.
- Handled validation: Label <=80 chars.
- Types: `ComponentDataByType<'ordered_list'>`? Wait, types.ts has OrderedListComponentData: { items: { label: string, value?: string }[] } (assuming 'list' type covers ordered).
- Props: `{ data: OrderedListComponentData }`.

### Footer
- Component description: Static footer with app branding and copyright.
- Main elements: `<footer>` with `role="contentinfo"`, simple text like "Built with Hackerfolio".
- Handled events: None.
- Handled validation: None.
- Types: None.
- Props: None.

## 5. Types
Leverage existing types from `src/types.ts` without new DTOs, as `PublicPortfolioDto` fully covers the data shape:

- `PublicPortfolioDto`: {
  username: string; // Extracted from URL, validated regex ^[a-z0-9-]{3,30}$
  portfolio: {
    title: string; // Required, <=100 chars
    description: string | null; // Optional
    published_at: string; // ISO date, non-null for published
  };
  sections: PublicSectionDto[]; // Sorted by position, only visible ones rendered
}

- `PublicSectionDto` extends `SectionDto`: {
  id: string;
  name: string; // <=150 chars
  position: number; // >=1, gapless
  visible: boolean;
  components: ComponentDto[]; // Sorted by position, only if section visible
}

- `ComponentDto`: {
  id: string;
  type: ComponentType; // Enum: 'text' | 'card' | 'pills' | 'social_links' | 'list' | 'image' | 'bio' | 'ordered_list' (note: types.ts has 'ordered_list' separate, but PRD lists 6 types; align to DB enum)
  position: number;
  data: ComponentData; // Discriminated union based on type
}

- `ComponentData`: Union of type-specific interfaces (e.g., `TextComponentData { content: string }`, `ProjectCardComponentData { repo_url: string; title: string; summary: string; tech: string[] }`, etc., as defined in types.ts). Use type guards like `if (component.type === 'text')` for safe access.

No new ViewModel types needed; use DTOs directly in props. For rendering, create a utility type `RenderedComponent = ComponentDto & { renderedData: ComponentDataByType<ComponentDto['type']> }` if type narrowing is complex, but inline guards suffice.

## 6. State Management
No client-side state management is required, as this is a fully SSR, static view with no interactivity. Data is fetched once server-side in the Astro page component using `Astro.request` or Supabase client (server mode). If minor client hydration is added (e.g., for lazy images), use React's `useState` in islands, but avoid for this read-only page. Props pass data down the tree statically.

## 7. API Integration
Integrate with `GET /api/v1/ssr/portfolios/:username` (server-side only endpoint, using Supabase service role key for auth bypass/RLS override). In the Astro page (`src/pages/[username].astro` or dynamic route handler):

- Request: Extract `username` from `Astro.url.hostname` (parse subdomain), call endpoint with `{ username }`. No body/query. Use `fetch` with service role in headers: `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}` (env var).
- Response type: `ApiSuccessResponse<PublicPortfolioDto>` (success) or `ApiErrorResponse` (e.g., 404 not_found, 403 not_published).
- Handle in SSR: If 200, pass `data` to layout; else, render 404. Cache response briefly if using Astro's caching, but fetch fresh per request for up-to-date content.

Supabase direct query alternative: Use server Supabase client to join `user_profiles` (by username), `portfolios` (if published), `sections` (visible, ordered), `components` (joined, ordered), filtering `is_published = true`.

## 8. User Interactions
This view is read-only with no direct interactions:
- Passive viewing: Users scroll through hero, sections, and components; external links (e.g., repo_url, social) open in new tabs (`target="_blank" rel="noopener"`).
- Mobile: Responsive stacking via Tailwind (e.g., flex-col on sm screens).
- Sharing: Page is shareable via URL; no copy/share buttons needed in MVP.
- Accessibility: Keyboard navigation via semantic HTML; screen reader support with ARIA labels/roles; high contrast via Tailwind.

If preview mode (non-public), add a subtle "Preview" banner, but public view has none.

## 9. Conditions and Validation
- API-enforced conditions (verified server-side, affect render):
  - `is_published: true`: If false or null, return 404 (PublicPortfolioPage shows error page).
  - At least 1 visible section with >=1 component: API rejects publish if unmet (US-013); view assumes valid if fetched.
  - Username validity: Regex check on subdomain; invalid → 404.
  - Visibility: Only render sections/components where `visible: true` (SectionRenderer/ComponentsContainer skip others).
  - Content limits: Per-type (e.g., text <=2000 chars) – API validates on create/update; view truncates if exceeded (rare).
- Component-level: In ComponentRenderer, use type guards to validate `data` matches `type` (e.g., throw if mismatch, but API ensures); ImageRenderer checks `url` starts with http/https.
- Interface state: No dynamic state; invalid data leads to empty renders or fallbacks (e.g., "No content" for empty text).

These conditions prevent invalid renders; client verifies post-fetch (e.g., if sections.length === 0 despite published, show "Portfolio under construction").

## 10. Error Handling
- Fetch errors (API down, network): Astro's error boundary or try-catch in page; render generic 500 page with "Service unavailable" message.
- 404/Not Found: If username invalid or portfolio not published, render Astro's built-in 404.astro with custom "Portfolio not found" copy.
- 403/Unauthorized: Should not occur (server-side), but fallback to 404.
- Data inconsistencies (e.g., missing data field): Use optional chaining/defaults in renderers (e.g., data.content || ''); log to console for debugging.
- Image load failures: `<img>` with `onerror` to show placeholder (Shadcn placeholder component).
- Edge cases: Empty published portfolio (API prevents, but show minimal hero); very long content (Tailwind overflow-auto); mobile overflow (ensure viewport meta).
- Accessibility errors: Validate with tools like Lighthouse post-implementation.

Use Supabase error codes from `ApiErrorResponse` to customize messages if needed.

## 11. Implementation Steps
1. Set up dynamic routing: Create `src/pages/[...slug].astro` or use Astro's subdomain config; parse `Astro.url.hostname` to get username, validate regex.
2. Implement SSR data fetch: In page script, import Supabase client (server mode), query public portfolio data joining tables with RLS/service role; or call internal API endpoint. Handle errors with 404/500 redirects.
3. Create Hero component: Build in `src/components/Hero.astro`, pass portfolio props, style with Tailwind hero classes and Shadcn heading.
4. Create SectionsContainer and SectionRenderer: In `src/components/SectionsContainer.astro` and `SectionRenderer.astro`; map sections, filter visible, pass to children.
5. Implement SectionHeader and ComponentsContainer: Simple Astro components for structure and iteration.
6. Build ComponentRenderer: In `src/components/ComponentRenderer.astro`, use Astro's `{@const}` for switch on type, import and render specific renderers.
7. Create type-specific renderers: One Astro file per type (e.g., `src/components/renderers/TextRenderer.astro`), using Shadcn/ui for cards/badges/icons; ensure responsive Tailwind classes (e.g., md:grid).
8. Add Footer: Basic `src/components/Footer.astro` with static content.
9. Integrate accessibility: Add ARIA roles, alt texts (from data.alt), semantic tags; test with screen readers.
10. Style overall: Apply Tailwind globals for mobile-first (e.g., max-w-7xl mx-auto), ensure clean typography.
11. Test: Mock data with sample PublicPortfolioDto; verify SSR output, 404 cases, component rendering; run Lighthouse for perf/accessibility.
12. Optimize: Add `loading="lazy"` for images; consider Astro's image optimization if assets are local.
