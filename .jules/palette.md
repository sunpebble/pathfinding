## 2025-02-18 - Replacing Manual Dropdowns with Primitives
**Learning:** Found a manual dropdown implementation in `AuthButton` (divs + state + event listeners) that lacked keyboard support and ARIA roles, despite `DropdownMenu` (Radix UI) being available in the project.
**Action:** Always check for existing accessible primitives (like Radix/Shadcn) before attempting to fix or improve custom interactive components. Refactoring to primitives is often the highest-leverage a11y win.
