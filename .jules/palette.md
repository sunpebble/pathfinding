# Palette's Journal

This journal documents critical UX and accessibility learnings. It is not a log of routine work.

## Format
`## YYYY-MM-DD - [Title]`
`**Learning:** [UX/a11y insight]`
`**Action:** [How to apply next time]`

## 2025-03-01 - Accessible Dialog Migration
**Learning:** Custom `div`-based modals often lack essential accessibility features like focus trapping, `Escape` key dismissal, and proper ARIA roles (`dialog`, `modal`, `aria-labelledby`, `aria-describedby`). They also require manual implementation of backdrops and scrolling.
**Action:** Replace custom modal implementations with the design system's `Dialog` component (Radix UI) which handles these accessibility concerns automatically. This ensures consistency and reduces maintenance overhead.
