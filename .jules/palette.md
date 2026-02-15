## 2024-05-21 - Standardizing Dropdown Menus
**Learning:** Manual implementations of dropdowns (using `useState` and `div`s) often lack critical accessibility features such as keyboard navigation (Arrow keys, Escape), focus management, and proper ARIA roles. The project's existing Radix UI `DropdownMenu` components provide these features automatically.
**Action:** Replace custom dropdown logic with `@/components/ui/dropdown-menu` components. Ensure `Link` components inside menu items are wrapped with `<DropdownMenuItem asChild>` to maintain correct semantics and accessibility props.
