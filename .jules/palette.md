## 2026-02-03 - Dynamic Labels for Stateful Actions
**Learning:** Icon-only buttons that change state (like "Copy" -> "Copied") need dynamic `aria-label`s to communicate the state change to screen reader users, not just visual icon changes.
**Action:** When implementing toggle or action buttons with icons, always ensure the `aria-label` reflects the current state (e.g., `aria-label={isCopied ? 'Copied' : 'Copy code'}`).
