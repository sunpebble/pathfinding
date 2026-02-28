## 2024-05-24 - [JWT Signature Bypass in HTTP Actions]

**Vulnerability:** The HTTP API implementation manually decoded JWT payloads from the `Authorization` header using `atob` and `JSON.parse` to extract the `sub` (user ID) claim.
**Learning:** This manual parsing bypasses the cryptographic signature verification of the token, allowing an attacker to submit a forged JWT with any user ID and effectively impersonate any user. It violates the core security requirement to cryptographically verify token signatures.
**Prevention:** Never manually parse and trust claims from a JWT token in HTTP endpoints without verifying its signature. Always rely on the secure built-in authentication provider (e.g., `ctx.auth.getUserIdentity()`) which implicitly validates the signature before returning the user identity.
