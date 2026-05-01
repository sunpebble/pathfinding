# Dashboard Style Refresh Design

## Goal

Refresh the admin dashboard styling across all existing dashboard pages using the selected Explorer Polish direction. The result should feel cohesive with the Pathfinding travel product: stone-toned surfaces, forest emerald accents, calm data cards, readable tables, and a polished navigation frame.

## Scope

In scope:

- Dashboard shell, sidebar, header, page background, and responsive chrome.
- Shared dashboard visual language for page headers, cards, filters, tables, empty states, loading states, and action buttons.
- Existing dashboard pages under `apps/dashboard/src/app/(dashboard)`: overview, jobs, jobs/backfill, pois, guides, datasets, itineraries, expenses, chat, and adjacent dashboard pages touched by shared chrome.
- Styling-only changes and small reusable presentational helpers where they reduce duplication.

Out of scope:

- API, routing, data fetching, auth, and database behavior changes.
- New component libraries or large UI framework migration.
- Business logic rewrites.
- Pixel-perfect dark mode coverage beyond preserving existing dark-compatible tokens where practical.

## Chosen Direction

Explorer Polish:

- Backgrounds use warm stone tones instead of generic gray.
- Primary action and active navigation use emerald.
- Cards have subtle borders, soft shadows, and rounded corners.
- Tables and list rows use softer separators and hover states.
- The visual tone stays operational and data-dense, but warmer than a pure ops console.

## Architecture

Implement the refresh with a small set of reusable styling helpers in the dashboard app:

- Extend `globals.css` with dashboard CSS variables and utility classes for surfaces, shadows, focus, and subtle topographic background accents.
- Add a lightweight dashboard UI helper module for common wrappers such as page headers, cards, toolbar containers, empty states, and loading states if this reduces repeated class strings.
- Keep page-specific content inside existing pages. Avoid moving business logic.
- Preserve existing UI primitives and Radix-based components.

## Component Design

Shared chrome:

- `DashboardLayout` uses a stone background with a subtle explorer texture and responsive padding.
- `Sidebar` uses the existing dark stone brand sidebar, with clearer active state, section spacing, and mobile overlay polish.
- `Header` becomes a translucent or elevated surface with improved service-status pill and accessible refresh control.

Shared page patterns:

- Page header: title, short description, optional icon, and right-aligned actions with responsive wrapping.
- Toolbar/filter area: card-like surface with consistent input/select/button height and focus treatment.
- Cards: white or tokenized surface, border, soft shadow, emerald hover highlight where clickable.
- Tables: rounded container, subtle header background, consistent row hover, horizontal overflow handling.
- Empty/loading/error states: centered card or panel with icon, concise copy, and optional action.

## Page Application

- `overview`: update stat cards and recent jobs panel to establish the visual baseline.
- `jobs`: align scheduler card, filters, table, and action buttons.
- `jobs/backfill`: align stat cards, alerts, selectable tables, and header actions.
- `pois`, `guides`, `itineraries`: align search/filter sections and content cards.
- `datasets`: align filters, table, and icon-only action styling.
- `expenses`: align tabs, section cards, forms, and empty states without rewriting the long page.
- `chat`: keep the chat layout behavior, but align outer surfaces and header with the dashboard theme.

## Accessibility

- Preserve existing `aria-label` attributes.
- Add `aria-label` for any icon-only interactive element that lacks one.
- Wrap icon-only buttons in `Tooltip` where practical, following repository convention.
- Maintain visible focus states via the existing or updated explorer focus ring.
- Keep sufficient color contrast for text, borders, status badges, and disabled controls.

## Testing And Verification

- Run dashboard typecheck after implementation.
- Run dashboard lint or repo lint if feasible.
- Run existing dashboard tests if changes touch components with tests.
- Use visual inspection through local dev server if dependency state allows it.

## Constraints

- Use Tailwind v4-compatible class names and existing project conventions.
- Prefer minimal, localized changes over broad rewrites.
- Do not alter API calls, query keys, or mutation behavior.
- Do not commit changes unless explicitly requested.
