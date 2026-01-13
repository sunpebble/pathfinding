## Raw Concept

**Task:**
Document authentication mechanism and token security policy

**Changes:**

- Implemented JWT-based authentication
- Configured 24h token expiry
- Set up httpOnly cookie storage for tokens

**Flow:**
User logs in -> Server generates JWT (24h expiry) -> Server sets httpOnly cookie -> Client sends cookie with subsequent requests -> Server validates JWT

**Timestamp:** 2026-01-13

## Narrative

### Features

# Authentication

- Uses JWT (JSON Web Tokens) for session management.
- Tokens have a 24-hour expiration period.
- Security: Tokens are stored in httpOnly cookies to prevent XSS-based token theft.
