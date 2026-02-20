## 2025-02-24 - Radix Dialog Replacement
**Learning:** Custom 'div'-based modals in 'apps/dashboard' lacked critical accessibility features (focus trap, ARIA roles, Escape dismissal). Replacing them with the design system's Radix 'Dialog' component automatically solved these issues but introduced duplicate close buttons (header vs footer) that required test updates.
**Action:** When refactoring modals, default to 'Dialog' primitives and check for redundant close buttons in tests using 'getAllByRole'.
