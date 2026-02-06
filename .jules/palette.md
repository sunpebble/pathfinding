## 2024-05-23 - Standardizing Dropdown Menus

**Learning:** Manual `div`-based dropdowns (using `useState` and click-outside listeners) are prevalent but lack critical accessibility features like keyboard navigation and focus management.
**Action:** Always refactor to use `@/components/ui/dropdown-menu` (Radix UI) which handles a11y, focus, and closing behavior automatically.
