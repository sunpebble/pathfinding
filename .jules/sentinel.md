## 2025-02-28 - Insecure JWT Decoding in HTTP Router

**Vulnerability:** The HTTP router extracted the user ID by directly base64-decoding the JWT payload from the `Authorization` header (`atob(base64)` and `JSON.parse`) without performing any cryptographic signature verification.
**Learning:** This bypassing of signature validation allows anyone to spoof any user ID by simply crafting a base64 string, leading to critical authentication bypass/impersonation vulnerabilities in HTTP APIs.
**Prevention:** Always extract user identity securely in Convex using `await ctx.auth.getUserIdentity()` which correctly verifies the JWT signature and audience.
