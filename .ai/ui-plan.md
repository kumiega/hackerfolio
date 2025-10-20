# UI Architecture for Hackerfolio

## 1. UI Structure Overview

The UI architecture for Hackerfolio is designed as a minimalist, developer-centric interface leveraging Astro for static and SSR pages, with React islands providing interactivity in the dashboard. The structure supports rapid portfolio creation through an intuitive onboarding flow, a split-view dashboard for editing sections and components, and SSR-rendered public portfolios. Key principles include simplicity for MVP (no advanced features like websockets), mobile responsiveness via stacked layouts, WCAG 2.1 AA accessibility with ARIA and keyboard support, and secure auth via Supabase. The architecture enforces PRD limits (10 sections, 15 components) through UI constraints and integrates seamlessly with the API plan for CRUD, imports, and publishing. Navigation is streamlined: static routing for landing/auth, sequential wizard for onboarding, and a header/sidebar in the dashboard. Error handling uses inline validations and toasts for general errors, while auto-save and optimistic updates enhance UX.

## 2. View List

### Landing Page
- Is already implementend as Marketing.astro page

### Auth/Login View
- **View Path**: `/login`
- **Main Purpose**: Handle user authentication via GitHub OAuth.
- **Key Information to Display**: Login button, error messages for failed attempts.
- **Key View Components**: Auth buttons (GitHub).
- **UX, Accessibility, and Security Considerations**: Full-page with focus management; ARIA roles for form errors and live regions; secure token handling via Supabase client, no stored credentials using shadcn login-02 block.

### Onboarding View
- **View Path**: `/onboarding` (post-auth redirect)
- **Main Purpose**: Single-page flow to claim username and setup portfolio with quick-start options.
- **Key Information to Display**: Step 1: Username input with real-time availability, subdomain preview; Step 2: Quick-start option cards (GitHub import, LinkedIn import, or start blank).
- **Key View Components**: Step indicator/progress bar, username input with availability status, option cards with descriptions/icons, submit/next buttons.
- **UX, Accessibility, and Security Considerations**: Sequential steps on single page; inline feedback with ARIA-live regions; keyboard navigation between steps; validates username uniqueness before proceeding to quick-start; requires auth session, auto-creates portfolio on selection.

### Dashboard View
- **View Path**: `/dashboard`
- **Main Purpose**: Enable CRUD operations on sections and components with reordering and preview/publish controls.
- **Key Information to Display**: Left panel: sections list with names, positions, visibility toggles (max 10 indicator); Right panel: selected section's components list with types, positions (max 15 total indicator); Header: portfolio title, preview/publish buttons.
- **Key View Components**: Split layout (desktop), stacked accordions (mobile), drag-and-drop zones for sections/components, add buttons, visibility toggles, preview link (new tab), publish/unpublish buttons.
- **UX, Accessibility, and Security Considerations**: Auto-save indicators and optimistic updates; keyboard drag-and-drop fallback with roving tabindex, ARIA labels for lists/toggles; auth-protected with RLS enforcement, input sanitization.

### GitHub Import Modal
- **View Path**: Modal overlay in dashboard or onboarding
- **Main Purpose**: Facilitate selection and generation of project cards from GitHub repos.
- **Key Information to Display**: Repo list with checkboxes (filterable), progress bar during generation, preview of generated cards, limit warning (3-10 repos).
- **Key View Components**: Searchable repo list, multi-select checkboxes, "Generate" button, preview pane, confirmation dialog.
- **UX, Accessibility, and Security Considerations**: Multi-step flow with back/next; ARIA for dynamic list updates and progress; uses OAuth token securely, handles rate limits with retry toasts.

### LinkedIn Import Modal
- **View Path**: Modal overlay in dashboard or onboarding
- **Main Purpose**: Parse LinkedIn profile and allow preview/editing before import.
- **Key Information to Display**: URL input, parsed JSON structure (name, headline, experience), editable fields, preview of components (e.g., bio/list).
- **Key View Components**: URL input, parse button, editable form sections, "Import" button with section selection.
- **UX, Accessibility, and Security Considerations**: Inline editing with validation; focus trap and ARIA dialogs; AI parsing via secure API call, no external scraping exposed.

### Component Edit Modal
- **View Path**: Modal overlay in dashboard
- **Main Purpose**: Add or edit components of specific types with validation and auto-save.
- **Key Information to Display**: Type selector, type-specific fields (e.g., text content, image URL/alt, card details), character limits, preview within modal.
- **Key View Components**: Dropdown for type, dynamic form (React Hook Form), file upload for images (size limit 2MB), save/cancel buttons.
- **UX, Accessibility, and Security Considerations**: Auto-save on change with confirmation; labeled inputs, error summaries with ARIA; validates limits client-side, sanitizes data before API submission.

### Preview View
- **View Path**: `/preview` (generated in new tab) or public URL post-publish
- **Main Purpose**: Display current portfolio state for review before publishing.
- **Key Information to Display**: Rendered sections and components in sequence, mimicking public view.
- **Key View Components**: Section headers, component renderers (e.g., text blocks, cards, images), responsive layout.
- **UX, Accessibility, and Security Considerations**: Read-only, full-width responsive; semantic HTML for screen readers; temporary generation, no auth for post-publish public access.

### Public Portfolio View
- **View Path**: `{username}.hackerfolio.test`
- **Main Purpose**: Serve the published portfolio via SSR for public viewing.
- **Key Information to Display**: User's title/description, visible sections and components.
- **Key View Components**: Hero with title, sequential section renders, footer if applicable.
- **UX, Accessibility, and Security Considerations**: Optimized for sharing, mobile-first; alt texts for images, navigation landmarks; SSR fetch only for published, 404 for unpublished.

## 3. User Journey Map

1. **New User Discovery**: Land on landing page → Read hero/3-steps → Click "Get Started" CTA → Open auth modal.
2. **Authentication**: Select GitHub login → OAuth redirect → Success → Redirect to onboarding.
3. **Onboarding Setup**: Step 1 - Enter desired username → Real-time availability check (green if available) → Submit → Proceed to Step 2; Step 2 - Choose quick-start option (GitHub import, LinkedIn import, or start blank) → Selection triggers import modal or direct dashboard entry.
   - Alternative: Choose LinkedIn → Open modal, paste URL → Parse → Edit/preview → Import to section → To dashboard.
   - Or blank → Direct to empty dashboard.
5. **Editing in Dashboard**: View split layout → Add section (button → modal for name/visible) → Drag to reorder → Select section → Add component (type modal) → Edit fields (auto-save) → Toggle visibility → Check limits (toasts if exceeded).
6. **Review and Publish**: Click preview → New tab shows rendered view → Return to dashboard → Click publish (validates min 1 section/component) → Success toast with public URL → Portfolio live on subdomain.
7. **Ongoing Management**: Re-enter dashboard → Edit/reorder/unpublish as needed → Imports for additions.
8. **Edge Journeys**: Error (e.g., username taken) → Inline message, retry input; Import fail → Toast with retry; Mobile → Stacked view, modal interactions.

## 4. Layout and Navigation Structure

- **Global Layout**: Astro-based with header (logo, logout on dashboard) and footer (landing only). Modals use Radix UI for overlays.
- **Static Pages (Astro)**: Landing (`/`) links to auth; Public portfolio (`{username}.hackerfolio.test`) is route-less SSR.
- **Protected Routes (React Island in Dashboard)**: `/dashboard` requires auth check (redirect if unauth). Internal nav: Header buttons (Preview, Publish, Logout); Left sidebar for sections (collapsible on mobile).
- **Modals and Flows**: Onboarding as single-page step flow (username → quick-start → imports); Dashboard modals for edits/imports (triggered by buttons). No complex sidebar nav; use breadcrumbs for deep flows (e.g., "Dashboard > Editing Section X").
- **Mobile Adaptation**: Tailwind responsive: Desktop split (grid-cols-2), mobile stacked (flex-col), modals full-screen.
- **Transitions**: Smooth redirects post-auth/onboarding; toasts for feedback; new-tab for previews to avoid disrupting edits.

## 5. Key Components

- **Auth Components**: LoginButton (GitHub triggers), SessionProvider (Supabase wrapper for session state).
- **Form Components**: DynamicForm (type-based with React Hook Form, validation for limits), InputWithValidation (inline errors, ARIA).
- **List Components**: DraggableSectionList (left panel, DnD with @dnd-kit, position indicators), ComponentRenderer (right panel, type-specific previews).
- **Modal Components**: ImportModal (multi-step with progress), EditModal (generic for components/sections, auto-save hook).
- **Feedback Components**: ToastNotifier (Sonner for API errors, mapped to user messages), LimitIndicator (progress bars for sections/components).
- **Render Components**: SectionRenderer (headers with visibility), ComponentDisplay (switches by type: TextBlock, ProjectCard, ImageWithAlt, etc., semantic HTML).
- **Navigation Components**: HeaderBar (dashboard actions), OptionCard (wizard selections, hover states)."
