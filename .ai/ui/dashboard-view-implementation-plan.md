# View Implementation Plan - Dashboard

## 1. Overview
The Dashboard View serves as the central interface for users to manage their portfolio by performing CRUD operations on sections and components. It features a split layout for desktop (left: sections list, right: components list) and stacked accordions for mobile, with drag-and-drop reordering, visibility toggles, and controls for preview and publishing. The Component Edit Modal is an overlay used for adding or editing components, providing type-specific forms with validation and auto-save functionality. This view enables quick portfolio building while enforcing limits (max 10 sections, 15 components) and ensuring a professional UX aligned with the Hackerfolio MVP goals.

## 2. View Routing
The Dashboard View is accessible at the path `/dashboard`. It should be protected by authentication, redirecting unauthenticated users to the login flow. The Component Edit Modal is triggered as an overlay within the dashboard, not as a separate route.

## 3. Component Structure
- Dashboard (main container)
  - Header (portfolio title, preview/publish buttons)
  - LeftPanel (SectionsList with AddSectionButton)
    - SectionItem (name, visibility toggle, reorder handle, delete button)
  - RightPanel (ComponentsList with AddComponentButton, conditional on selected section)
    - ComponentItem (type preview, visibility toggle, reorder handle, edit/delete buttons)
  - ComponentEditModal (overlay for add/edit, with TypeSelector, DynamicForm, PreviewPane)

High-level hierarchy:
```
Dashboard
├── Header
├── LeftPanel
│   ├── AddSectionButton
│   └── SectionsList
│       └── SectionItem (xN)
└── RightPanel
    ├── AddComponentButton
    ├── ComponentsList (conditional)
    │   └── ComponentItem (xN)
    └── ComponentEditModal (overlay)
```

## 4. Component Details
### Dashboard
- Component description: Main layout container managing the overall state, API integrations, and rendering of panels. Handles split view for desktop and stacked for mobile, with auto-save indicators.
- Main elements: `<div class="flex h-screen">` for split, `<Accordion>` for mobile; child components: Header, LeftPanel, RightPanel, ComponentEditModal.
- Handled interactions: Resize splitter (optional), modal open/close, global error toasts.
- Handled validation: Enforce section/component limits before allowing adds; optimistic updates with rollback on failure.
- Types: PortfolioDto, SectionDto[], ComponentDto[], ApiResponse<T>.
- Props: Accepts session from parent (e.g., layout), portfolioId: string.

### Header
- Component description: Top bar displaying portfolio title (editable inline), description, and action buttons for preview (new tab) and publish/unpublish.
- Main elements: `<header class="sticky top-0 bg-white border-b">` with `<Input>` for title, `<Button>` for preview/publish.
- Handled interactions: Title edit (PATCH portfolio), preview click (window.open(`/ssr/${username}`)), publish click (POST /publish if valid).
- Handled validation: Disable publish if <1 section or <1 component total; validate title <=100 chars.
- Types: UpdatePortfolioCommand, PublishStatusDto.
- Props: portfolio: PortfolioDto, onUpdate: (command: UpdatePortfolioCommand) => void, onPublish: () => void.

### LeftPanel
- Component description: Sidebar for sections management, showing list with positions, names, visibility, and add button. Handles section selection.
- Main elements: `<aside class="w-1/3 border-r">` with `<Button>` for add, `<ul class="space-y-2">` for list.
- Handled interactions: Add section click (open modal), section select (set selectedSection), drag-drop reorder.
- Handled validation: Prevent add if sections.length >=10; real-time name/visible updates (PATCH section).
- Types: CreateSectionCommand, SectionDto, ReorderCommand.
- Props: sections: SectionDto[], selectedSectionId: string, onSelect: (id: string) => void, onAdd: () => void, onReorder: (id: string, position: number) => void.

### SectionItem
- Component description: Individual section row with drag handle, name input, visibility toggle, delete button.
- Main elements: `<li class="flex items-center p-2 border rounded">` with `<DragHandle>`, `<Input>` for name, `<Switch>` for visible, `<Button variant="destructive">` for delete.
- Handled interactions: Drag start/end (reorder API), name change (auto-save PATCH), toggle change (PATCH visible), delete confirm (DELETE section).
- Handled validation: Name <=150 chars; prevent delete if sections.length <=1 and !published.
- Types: UpdateSectionCommand, ReorderCommand.
- Props: section: SectionDto, isSelected: boolean, position: number, onUpdate: (command: UpdateSectionCommand) => void, onReorder: (position: number) => void, onDelete: (id: string) => void.

### RightPanel
- Component description: Main content area for selected section's components, with add button and list. Shows total components count and limit warning.
- Main elements: `<main class="flex-1 p-4">` with `<div class="mb-4">` for count/indicator, `<Button>` for add, `<ul>` for list.
- Handled interactions: Add component click (open modal with sectionId), component select for edit.
- Handled validation: Prevent add if total components >=15; show toast on limit.
- Types: ComponentDto[], ComponentListQuery.
- Props: sectionId?: string, components: ComponentDto[], totalComponents: number, onAdd: (sectionId: string) => void.

### ComponentItem
- Component description: Row for a component showing type icon/preview, position, visibility, edit/delete actions.
- Main elements: `<li class="flex items-center p-2 border rounded">` with type badge, `<Switch>` visible, `<Button>` edit/delete.
- Handled interactions: Drag reorder, toggle visible (PATCH via section? or direct), edit click (open modal), delete confirm (DELETE).
- Handled validation: Visibility tied to component data if applicable.
- Types: UpdateComponentCommand (for visible if extended).
- Props: component: ComponentDto, position: number, onReorder: (position: number) => void, onEdit: (id: string) => void, onDelete: (id: string) => void.

### AddSectionButton
- Component description: Button to trigger section creation modal/drawer.
- Main elements: `<Button>Add Section</Button>`.
- Handled interactions: Click opens SectionCreateModal (simple form for name/visible).
- Handled validation: Disabled if limit reached.
- Types: CreateSectionCommand.
- Props: disabled: boolean, onClick: () => void.

### ComponentEditModal
- Component description: Overlay modal for creating/editing components, with type selector and dynamic form fields based on type.
- Main elements: `<Dialog open={isOpen}>` with `<Select>` for type, conditional form sections (e.g., `<Textarea>` for text, `<Input>` for URLs), preview pane, save/cancel.
- Handled interactions: Type change (reset form), field changes (auto-save on blur/debounce), file upload for images, close on escape/cancel.
- Handled validation: Type-specific (e.g., text <=2000 chars, image <=2MB, required fields); client-side before API.
- Types: CreateComponentCommand, UpdateComponentCommand, ComponentDataByType<ComponentType>.
- Props: isOpen: boolean, sectionId: string, component?: ComponentDto, onClose: () => void, onSave: (command: CreateComponentCommand | UpdateComponentCommand) => void.

### TypeSelector
- Component description: Dropdown to choose component type (text, card, etc.).
- Main elements: `<Select>` with options from ComponentType enum.
- Handled interactions: Selection changes form schema.
- Handled validation: Required.
- Types: ComponentType.
- Props: value: ComponentType, onChange: (type: ComponentType) => void.

### DynamicForm
- Component description: Form that renders fields based on selected type using React Hook Form.
- Main elements: Conditional renders like `<Input>`, `<Textarea>`, `<Badge>` for arrays (tech/pills).
- Handled interactions: Input changes trigger validation/auto-save.
- Handled validation: Schema per type (zod/resolvers), char limits, URL validation.
- Types: ComponentDataMap.
- Props: type: ComponentType, defaultValues: ComponentData, onChange: (data: ComponentData) => void.

## 5. Types
Utilize existing types from src/types.ts including ComponentType enum, ComponentData union, SectionDto, ComponentDto, PortfolioDto, CreateSectionCommand, UpdateSectionCommand, CreateComponentCommand, UpdateComponentCommand, ReorderCommand, ApiSuccessResponse<T>, ApiErrorResponse.

New ViewModel types:
- SectionViewModel extends SectionDto { isExpanded?: boolean; isEditing?: boolean; } – Adds UI flags for accordion state and inline editing.
  - Fields: id: string, name: string, position: number, visible: boolean, isExpanded?: boolean, isEditing?: boolean.
- ComponentViewModel extends ComponentDto { preview?: ReactNode; error?: string; } – For UI preview and temp errors.
  - Fields: id: string, section_id: string, type: ComponentType, position: number, data: ComponentData, visible?: boolean (if extended), preview?: ReactNode, error?: string.
- DashboardState { portfolio: PortfolioDto | null, sections: SectionViewModel[], components: { [sectionId: string]: ComponentViewModel[] }, selectedSectionId: string | null, isPublished: boolean, totalComponents: number, limits: { sections: 10, components: 15 } } – Central state for reactivity.
  - Fields: portfolio: PortfolioDto | null, sections: SectionViewModel[], components: Record<string, ComponentViewModel[]>, selectedSectionId: string | null, isPublished: boolean, totalComponents: number, limits: { sections: number, components: number }.
- FormErrors { [field: string]: string } – For displaying validation errors in modal.

These extend DTOs for UI-specific needs like previews and states, ensuring type safety with TS 5.

## 6. State Management
State is managed locally in the Dashboard component using React's useState and useReducer for complex updates (e.g., reordering). A custom hook `useDashboard` will encapsulate API fetches, optimistic updates, and auto-save logic:
- Fetches initial data on mount: GET /portfolios/me, then sections and components.
- useState for selectedSectionId, modal state.
- useReducer for sections/components arrays to handle reorder, add/remove immutably.
- useEffect for auto-save: debounce PATCH on changes (e.g., name, visible, data).
- Context optional for modals if nested deep, but props drilling sufficient for this view.
- Persist optimistic state, rollback on API error with toast notification.

## 7. API Integration
Integrate via fetch or Supabase client with JWT auth. Base URL: /api/v1.

Key calls:
- GET /portfolios/me → ApiResponse<PortfolioDto> (initial portfolio).
- GET /portfolios/:id/sections → ApiResponse<SectionDto[]> (list sections, with pagination if >10 but unlikely).
- POST /portfolios/:id/sections → ApiResponse<SectionDto> (create, body: CreateSectionCommand).
- PATCH /sections/:id → ApiResponse<SectionDto> (update name/visible, body: UpdateSectionCommand).
- POST /sections/:id/reorder → ApiResponse<SectionDto> (body: ReorderCommand).
- DELETE /sections/:id → 204 (delete, check cannot_delete_last_required error).
- GET /sections/:id/components → ApiResponse<ComponentDto[]> (list, query: ComponentListQuery for type/q).
- POST /sections/:id/components → ApiResponse<ComponentDto> (create, body: CreateComponentCommand).
- PATCH /components/:id → ApiResponse<ComponentDto> (update data, body: UpdateComponentCommand).
- POST /components/:id/reorder → ApiResponse<ComponentDto> (body: ReorderCommand).
- DELETE /components/:id → 204 (delete).
- POST /portfolios/:id/publish → ApiResponse<PublishStatusDto> (validate min requirements client-side first).

Use TypeScript for request/response typing, handle ApiErrorResponse with code-specific messages.

## 8. User Interactions
- Add Section: Click AddSectionButton → Open SectionCreateModal (simple form) → Submit POST → Optimistic add to list → Auto-save name/visible changes on blur.
- Reorder Section: Drag SectionItem → Drop → POST reorder for affected items → Update positions.
- Edit Section: Inline Input on name → Debounce PATCH → Toggle Switch → PATCH visible.
- Delete Section: Click delete → Confirm dialog → DELETE → Remove from list, check limit.
- Select Section: Click SectionItem → Set selectedSectionId → Fetch/load components in RightPanel.
- Add Component: Click AddComponentButton (if section selected) → Open ComponentEditModal with sectionId → Select type → Fill form → Auto-save on change → Close on save.
- Edit Component: Click edit on ComponentItem → Open Modal with existing data/type → Update fields → PATCH data.
- Reorder Component: Drag ComponentItem → POST reorder.
- Delete Component: Confirm → DELETE → Remove.
- Preview: Click button → window.open(`https://${username}.hackerfolio.test`).
- Publish: Click if valid → POST publish → Update isPublished state, show toast with URL.
- Mobile: Use touch drag (react-dnd-touch), stack panels in Accordion.
- Auto-save: Show spinner/indicator on changes, toast on success/fail.

All interactions include loading states, toasts for feedback (success/error/limit).

## 9. Conditions and Validation
- Section Limit: In LeftPanel/AddSectionButton, check sections.length < 10; disable button, show toast "Max 10 sections reached" on attempt.
- Component Limit: In RightPanel/AddComponentButton, compute totalComponents across all sections <15; disable, toast "Max 15 components reached".
- Publish Conditions: In Header, disable button if sections.length === 0 || totalComponents === 0; on click, verify via API but client-check first.
- Form Validations (Modal): Use React Hook Form + Zod schemas per type:
  - Text: content required, length <=2000.
  - Card: repo_url valid URL, title <=100, summary <=500, tech array <=10 items.
  - Pills: items <=30, each <=20 chars.
  - Social: URLs valid if present.
  - List: items label <=80, url valid.
  - Image: url valid, alt <=120, file size <=2MB (client upload check).
  - Bio: headline <=120, about <=2000.
- Visibility: Toggle updates API immediately, reflects in preview.
- Username/Portfolio: Assume set post-onboarding; redirect if not.
- These affect UI: Disable buttons, show error messages in forms (ARIA-describedby), prevent submits.

## 10. Error Handling
- API Errors: Catch ApiErrorResponse, map codes to user messages (e.g., 'section_limit_reached' → "Cannot add more sections"), show via toast (shadcn Toaster). For 401/403, redirect to login. For 422 validation, highlight form fields.
- Network/Timeout: Retry once on 5xx, show "Connection error, retry?" toast.
- Limit Exceeds: Client-prevent where possible, but API 409 → toast.
- Delete Last: API 409 'cannot_delete_last_required' → toast "Cannot delete last section before publishing".
- Optimistic Rollback: On PATCH/POST fail, revert UI state, show error.
- Form Errors: Display inline with red borders, summary at top for accessibility.
- Edge: No sections → Show empty state "Add your first section"; No components → "Select a section to add components".
- Logging: Send to /errors endpoint on unhandled errors.
- Accessibility: ARIA live for errors/toasts, focus management on modals.

## 11. Implementation Steps
1. Set up Dashboard page in src/pages/dashboard.astro with React island for interactive parts: `<DashboardClient />` wrapping client components.
2. Install dependencies if needed: react-dnd for drag-drop, @hookform/resolvers/zod for forms, lucide-react for icons.
3. Create shared types in src/types.ts if new ViewModels needed, extend existing.
4. Implement useDashboard hook: useSWR or useEffect/fetch for data, useReducer for mutations, debounce for auto-save.
5. Build Header: Inline editable title with PATCH, publish logic with validation.
6. Build LeftPanel and SectionItem: Use DndKit or react-dnd for reorder, inline edits with auto-save.
7. Build RightPanel and ComponentItem: Similar to sections, conditional render.
8. Implement AddSectionButton and simple SectionCreateModal (Dialog with form).
9. Create ComponentEditModal: Use Dialog, Select for type, DynamicForm with switch on type for fields, integrate React Hook Form + Zod.
10. Add drag-drop: Configure sortable lists for sections/components separately.
11. Integrate API calls: Use Supabase client or fetch with types, handle envelopes.
12. Add toasts/notifications: Use sonner or shadcn Toast.
13. Handle mobile: Use Tailwind responsive classes, replace split with Accordion from shadcn.
14. Accessibility: Add ARIA roles (listbox for drags, labels for toggles), keyboard nav with roving tabindex.
15. Test: Unit for hooks/forms, e2e for interactions (Cypress), check limits/validations.
16. Style with Tailwind/shadcn: Consistent buttons, cards, modals.
17. Optimize: Memoize lists, virtualize if components grow (but limits small).
