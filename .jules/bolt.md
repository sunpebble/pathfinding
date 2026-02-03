## 2024-05-22 - Force Remount Anti-pattern
**Learning:** Using `key=${id}-${refreshKey}` to force component remounting on data updates causes loss of local state (e.g., search inputs, expansion state) and severe performance degradation due to DOM thrashing.
**Action:** Rely on React's natural reconciliation and data flow (props/context updates) for re-renders. Use `useEffect` or `useQuery` reactivity for data updates instead of brute-force remounting.
