# Architecture

**Analysis Date:** 2026-01-25

## Pattern Overview

**Overall:** Monorepo

**Key Characteristics:**

- Separation of concerns through distinct applications and shared packages.
- Facilitates code sharing and consistent tooling across different projects.
- Each application (`apps/`) is an independent deployable unit.
- Shared code (`packages/`) provides reusable modules.

## Layers

**Application Layer (apps/):**

- Purpose: Contains the main applications of the project.
- Location: `/apps/`
- Contains: Frontends (web, mobile) and backend services.
- Depends on: Shared packages (`packages/`), external services.
- Used by: End-users (frontends), other services (backend APIs).

**Shared Packages Layer (packages/):**

- Purpose: Provides reusable utilities, types, constants, and domain-specific logic.
- Location: `/packages/`
- Contains: TypeScript/JavaScript libraries, common configurations.
- Depends on: None (intended to be foundational), potentially other shared packages.
- Used by: Applications in the `apps/` directory.

**AI/Workflow Layer:**

- Purpose: Handles AI-related tasks, content crawling, and workflow automation.
- Location: `/apps/ai-service/`, `/comfyui/`, `/n8n/`
- Contains: AI models, crawlers, workflow definitions.
- Depends on: Shared packages, external APIs.
- Used by: Application layer for specific functionalities.

## Data Flow

**General Flow:**

1. User interaction on `apps/ios` or `apps/dashboard` triggers requests.
2. Requests are routed to `apps/ai-service` or interact directly with `convex`.
3. `apps/ai-service` processes requests, potentially interacting with crawlers (`src/lib/crawlers/`) or external APIs.
4. Data is stored/retrieved from `convex` (likely a real-time database).
5. Responses are returned to the client applications.

**State Management:**

- Not explicitly determined for each application, but likely handled within each app's framework (e.g., React state for dashboard, Swift Combine/State for iOS).
- `convex` is the central data store, suggesting real-time data synchronization capabilities.

## Key Abstractions

**Type Definitions:**

- Purpose: Ensures type safety and consistency across services and applications.
- Examples: `/packages/types/src/`, `/packages/crawler-types/src/`
- Pattern: Centralized TypeScript type declarations.

**Utility Functions:**

- Purpose: Common helper functions to avoid code duplication.
- Examples: `/packages/utils/src/`
- Pattern: Small, focused, reusable functions.

**API Clients:**

- Purpose: Abstract away external API interactions for iOS app.
- Examples: `/apps/ios/Pathfinding/Pathfinding/Core/Network/Clients/*.swift`
- Pattern: Dedicated classes/structs for each external API or domain.

**Crawler Interfaces:**

- Purpose: Standardize the way data is extracted from various travel platforms.
- Examples: `/apps/ai-service/src/lib/crawlers/` (e.g., `ctrip.ts`, `mafengwo.ts`)
- Pattern: Common interface for different crawler implementations.

## Entry Points

**AI Service:**

- Location: `/apps/ai-service/src/` (likely `index.ts` or `app.ts`)
- Triggers: API requests from frontends or internal schedules.
- Responsibilities: Handle AI tasks, data crawling, API orchestration.

**Dashboard Web Application:**

- Location: `/apps/dashboard/src/app/page.tsx`
- Triggers: Browser access by users.
- Responsibilities: User interface rendering, interaction logic, data display.

**iOS Mobile Application:**

- Location: `/apps/ios/Pathfinding/Pathfinding/PathfindingApp.swift` (typical SwiftUI) or `/apps/ios/Pathfinding/Pathfinding/AppDelegate.swift` (UIKit)
- Triggers: App launch on an iOS device.
- Responsibilities: Mobile UI, native features, API communication.

## Error Handling

**Strategy:** Not fully discernible without code inspection.

**Patterns:**

- Expected to use language/framework specific mechanisms (e.g., try-catch in TypeScript, Swift error handling).
- API errors likely communicated via standardized HTTP status codes and response bodies.

## Cross-Cutting Concerns

**Logging:** Not explicitly identified, but `packages/logger` suggests a centralized logging utility.
**Validation:** Likely handled at API boundaries (backend) and UI layers (frontend).
**Authentication:** Not explicitly identified, but common across applications.

---

_Architecture analysis: 2026-01-25_
