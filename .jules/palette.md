## 2025-02-14 - Tooltips on Icon-Only Buttons
**Learning:** Icon-only buttons should be wrapped in `Tooltip` with `TooltipTrigger asChild` to ensure accessibility and usability, providing context for sighted users who don't rely on `aria-label`.
**Action:** Use the `Tooltip` component from `@/components/ui/tooltip` for all future icon-only buttons in `apps/dashboard`.
