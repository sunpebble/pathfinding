# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Deno (stable), TypeScript 5.x, React Native (Expo SDK latest)
**Primary Dependencies**: Hono (backend), Expo Router (mobile), Convex client, React Native Maps
**Storage**: Convex, AsyncStorage (mobile offline cache)
**Testing**: Deno test (backend), Jest + React Native Testing Library (mobile)  
**Target Platform**: iOS 14+, Android 8+, Deno runtime on server  
**Project Type**: Monorepo (mobile app + API backend + shared packages)  
**Performance Goals**: API < 500ms p95, mobile 60fps, < 3s initial load, offline sync < 5s  
**Constraints**: Location accuracy ±10m, < 100KB API responses, < 50MB app bundle  
**Scale/Scope**: 10k+ users, real-time location updates, offline-first map data

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [ ] **Monorepo Package Isolation**: Feature implemented as isolated package with clear boundaries
- [ ] **Mobile-First Architecture**: UI prioritizes mobile experience, < 3s load time, offline support considered
- [ ] **Location & Privacy Security**: Location data encrypted, user consent obtained, RLS policies defined
- [ ] **Real-Time Collaboration**: Team features sync within 30s, WebSocket reconnection implemented
- [ ] **Observability**: OpenTelemetry tracing added, Sentry configured with travel context
- [ ] **Technology Stack Compliance**: Uses approved stack (Deno/Hono backend, React Native/Expo frontend)
- [ ] **Performance Standards**: API < 500ms p95, mobile 60fps, offline sync < 5s
- [ ] **Quality Gates**: Tests > 70% coverage, ESLint/Prettier pass, conventional commits

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/mobile, packages/api, packages/shared).

  探路 uses a monorepo structure managed by Turborepo with React Native + Deno backend.
-->

```text
# Monorepo Structure (Turborepo + pnpm workspaces)
apps/
├── mobile/                  # React Native Expo app
│   ├── src/
│   │   ├── screens/        # Screen components
│   │   ├── components/     # Reusable UI components
│   │   ├── navigation/     # React Navigation setup
│   │   ├── services/       # API clients, location services
│   │   ├── hooks/          # Custom React hooks
│   │   └── store/          # State management (Context/Redux)
│   └── __tests__/          # Mobile app tests
│
├── api/                     # Deno + Hono backend
│   ├── src/
│   │   ├── routes/         # Hono API routes
│   │   ├── services/       # Business logic
│   │   ├── models/         # Data models
│   │   ├── middleware/     # Auth, logging, error handling
│   │   └── utils/          # Helpers
│   └── tests/              # Backend tests
│
packages/
├── convex/                  # Convex schema and functions
├── types/                   # Shared TypeScript types
├── utils/                   # Shared utility functions
├── config/                  # Shared configuration (ESLint, Prettier, Commitlint)
└── constants/               # Shared constants
```

**Structure Decision**: [Document the selected packages and their responsibilities for this specific feature]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
