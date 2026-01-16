<!--
Sync Impact Report - Version 1.0.0
=====================================
Version Change: N/A → 1.0.0 (Initial constitution)

Modified Principles:
- All principles are newly defined for initial version

Added Sections:
- Core Principles (5 principles for mobile/travel app development)
- Technology Stack & Standards
- Development Workflow & Quality Gates
- Governance

Templates Requiring Updates:
✅ plan-template.md - Aligned with monorepo structure (web + mobile)
✅ spec-template.md - User stories align with travel/location features
✅ tasks-template.md - Task structure supports mobile app development patterns

Follow-up TODOs:
- None - all placeholders filled with concrete values

-->

# 探路 (Pathfinding) Travel App Constitution

## Core Principles

### I. Monorepo Package Isolation

Every feature must be implemented as an isolated package within the Turborepo monorepo structure.

**Rules**:

- Packages MUST be self-contained with clear boundaries (backend API, mobile app, shared libraries)
- Shared code MUST reside in dedicated packages (e.g., `@pathfinding/types`, `@pathfinding/utils`)
- Cross-package dependencies MUST be explicit in package.json
- Each package MUST have independent testing capabilities
- No circular dependencies between packages

**Rationale**: Monorepo isolation enables parallel development, independent deployment of backend services, and clear code ownership while maintaining shared standards across the codebase.

### II. Mobile-First Architecture

All features MUST be designed with mobile experience as the primary interface.

**Rules**:

- UI/UX decisions prioritize mobile screen sizes and touch interactions
- Performance targets based on mobile device capabilities (< 3s initial load, < 100ms UI response)
- Offline-first design: Core features MUST work without network connectivity
- Location services MUST handle GPS accuracy variations and battery optimization
- All API responses MUST be optimized for mobile bandwidth constraints (< 100KB per request)

**Rationale**: 探路 is a travel companion app used on-the-go. Mobile performance, offline capability, and location accuracy directly impact user experience in real travel scenarios.

### III. Location & Privacy Security (NON-NEGOTIABLE)

User location data and personal travel information MUST be protected with highest security standards.

**Rules**:

- Location data MUST be encrypted in transit (TLS 1.3+) and at rest (AES-256)
- User consent MUST be obtained before collecting location data
- Location sharing MUST be opt-in with configurable visibility (team-only, private)
- Personal travel plans MUST NOT be publicly visible by default
- Third-party integrations (Didi, Gaode Maps) MUST NOT receive user data without explicit consent
- Convex functions MUST enforce data access control on all user data tables
- Sentry error logging MUST scrub sensitive data (coordinates, user IDs, personal info)

**Rationale**: Travel apps handle highly sensitive location and itinerary data. Privacy breaches could expose users' real-time locations and travel patterns, creating physical safety risks.

### IV. Real-Time Collaboration Features

Team-based features (小分队) MUST provide real-time synchronization and presence awareness.

**Rules**:

- Team member locations MUST update within 30 seconds when shared
- Chat messages MUST be delivered with < 2s latency
- Shared itinerary edits MUST sync to all team members immediately
- Presence indicators MUST show online/offline status
- Conflict resolution for simultaneous edits MUST be handled gracefully (last-write-wins with notification)
- WebSocket connections MUST implement reconnection logic with exponential backoff

**Rationale**: Travel teams coordinate in real-time during trips. Stale location data or delayed messages can cause coordination failures and negatively impact user experience.

### V. Observability & Travel Context Logging

All operations MUST be observable with travel-specific context for debugging production issues.

**Rules**:

- OpenTelemetry tracing MUST be implemented for all API requests with travel context (user_id, trip_id, location_coordinates)
- Sentry error tracking MUST include breadcrumbs showing user's travel journey before errors
- Performance metrics MUST track mobile-specific concerns (API latency, offline sync duration, map rendering time)
- Location-based operations MUST log coordinates (with user privacy filters) for debugging GPS/mapping issues
- All logs MUST be structured JSON with consistent field naming
- Backend services MUST expose health check endpoints for monitoring

**Rationale**: Travel apps involve complex interactions between location services, third-party APIs, and real-time data. Rich observability enables rapid diagnosis of issues that users encounter in diverse travel scenarios and network conditions.

## Technology Stack & Standards

### Approved Technologies

**Backend** (NON-NEGOTIABLE):

- Runtime: Deno (stable channel)
- Framework: Hono for API routes
- Database: Convex (self-hosted)
- Error Tracking: Sentry
- Observability: OpenTelemetry for distributed tracing

**Frontend** (NON-NEGOTIABLE):

- Framework: React Native with Expo
- Code Quality: ESLint, Prettier (enforce via pre-commit hooks)
- Commit Standards: Commitlint + Husky for conventional commits

**Monorepo Management**:

- Build System: Turborepo with cached builds
- Package Manager: pnpm (workspace protocol for internal packages)

### Technology Constraints

- Map providers MUST support offline tile caching (evaluate Mapbox, Gaode Maps SDK)
- Third-party SDKs (Didi, WeChat, Weibo) MUST be wrapped in adapter interfaces to allow swapping
- Image processing MUST use native mobile libraries (not web-based) for performance
- Database schema changes MUST be reflected in Convex schema with proper migration plan

### Performance Standards

- API endpoints MUST respond within 500ms p95 latency
- Mobile app MUST achieve 60fps during map interactions
- Offline data sync MUST complete within 5 seconds on 4G connection
- App bundle size MUST NOT exceed 50MB (excluding over-the-air updates)

## Development Workflow & Quality Gates

### Feature Development Process

1. **Specification**: Use `/speckit.spec` to create feature spec with user stories prioritized by travel UX impact
2. **Planning**: Use `/speckit.plan` to define implementation strategy, ensuring mobile + backend coordination
3. **Constitution Check**: Verify compliance with location security, mobile-first design, and observability principles
4. **Implementation**: Follow test-driven development for critical paths (location, payment, data sync)
5. **Review**: All PRs require 1 approval + automated checks (ESLint, Prettier, test coverage > 70%)

### Quality Gates (Pre-Merge)

- ✅ All ESLint rules pass (no warnings in production code)
- ✅ Prettier formatting applied (enforced by Husky pre-commit)
- ✅ Conventional commits format (enforced by Commitlint)
- ✅ Test coverage > 70% for new code (unit + integration)
- ✅ No Sentry errors introduced by changes (smoke test required)
- ✅ OpenTelemetry tracing verified for new API endpoints
- ✅ Mobile build succeeds on iOS and Android (Expo EAS build check)
- ✅ Performance regression test passes (Lighthouse mobile score > 80)

### Code Review Requirements

- Location/privacy features MUST be reviewed by 2 team members
- Third-party integrations MUST include fallback error handling
- Database schema changes MUST include migration scripts + rollback plan
- Map/location features MUST be tested on real devices (not just simulators)

## Governance

### Amendment Process

1. Propose changes via GitHub issue with rationale and impact analysis
2. Team discussion period (minimum 3 days for MINOR, 7 days for MAJOR changes)
3. Approval requires consensus (simple majority for PATCH, unanimous for MAJOR)
4. Update version following semantic versioning:
   - **MAJOR**: Breaking changes to core principles (e.g., removing security requirements)
   - **MINOR**: New principles or significant expansions (e.g., adding new technology constraints)
   - **PATCH**: Clarifications, typo fixes, non-semantic refinements
5. Create migration plan for existing code if needed
6. Update all template files to reflect changes

### Compliance Verification

- Constitution supersedes all other development practices and style guides
- All PRs MUST pass constitution compliance check before merge
- Complexity that violates principles MUST be explicitly justified in implementation plan
- Quarterly audit of codebase for constitution adherence (track violations in GitHub Issues)

### Living Document

- Review constitution every 6 months or after major platform changes (React Native updates, Deno releases)
- Gather team feedback on principle effectiveness during retrospectives
- Archive amendment history in Git with descriptive commit messages

**Version**: 1.0.0 | **Ratified**: 2026-01-02 | **Last Amended**: 2026-01-02
