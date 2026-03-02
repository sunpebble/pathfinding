## 2025-02-28 - [IDOR via Substring Matching for Ownership Checks]
**Vulnerability:** A critical IDOR (Insecure Direct Object Reference) vulnerability was found in `convex/guideComments.ts` where ownership of a comment was being verified using `.includes()` (i.e. `comment.userId.includes(args.userId) || args.userId.includes(comment.userId)`).
**Learning:** This substring matching allowed for unauthorized deletions and modifications if one user ID happened to be a substring of another. This happened as a misguided attempt to handle cases where JWT `sub` might be a compound ID or different format.
**Prevention:** Always use strict equality (`===`) for permission validation and ownership checks. Substring matching for user ID or ownership checks is strictly prohibited.
