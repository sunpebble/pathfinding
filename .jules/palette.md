## 2024-05-22 - Polymorphic Interactive Badges
**Learning:** Found interactive badges (like `GeocodingConfidenceBadge`) implemented as clickable `div`s, which hurts accessibility (no keyboard focus/activation).
**Action:** When a visual badge can be interactive, conditionally render it as a `<button>` (with `type="button"`) when an `onClick` prop is present, ensuring keyboard accessibility while maintaining visual consistency via shared `className`s.
