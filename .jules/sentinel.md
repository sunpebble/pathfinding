## 2025-02-28 - [IDOR via Substring Matching for Ownership Checks]

**Vulnerability:** A critical IDOR (Insecure Direct Object Reference) vulnerability was found in `convex/guideComments.ts` where ownership of a comment was being verified using `.includes()` (i.e. `comment.userId.includes(args.userId) || args.userId.includes(comment.userId)`).
**Learning:** This substring matching allowed for unauthorized deletions and modifications if one user ID happened to be a substring of another. This happened as a misguided attempt to handle cases where JWT `sub` might be a compound ID or different format.
**Prevention:** Always use strict equality (`===`) for permission validation and ownership checks. Substring matching for user ID or ownership checks is strictly prohibited.

## 2025-02-28 - Insecure JWT Decoding in HTTP Router

**Vulnerability:** The HTTP router extracted the user ID by directly base64-decoding the JWT payload from the `Authorization` header (`atob(base64)` and `JSON.parse`) without performing any cryptographic signature verification.
**Learning:** This bypassing of signature validation allows anyone to spoof any user ID by simply crafting a base64 string, leading to critical authentication bypass/impersonation vulnerabilities in HTTP APIs.
**Prevention:** Always extract user identity securely in Convex using `await ctx.auth.getUserIdentity()` which correctly verifies the JWT signature and audience.
