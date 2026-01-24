# Technology Stack

**Analysis Date:** 2026-01-25

## Languages

**Primary:**

- TypeScript 5.9.3 - Backend (apps/ai-service), Frontend (apps/dashboard), Convex functions, shared packages
- Swift - iOS App (apps/ios)

**Secondary:**

- JavaScript - Build scripts, configuration files
- YAML - Docker-compose configurations

## Runtime

**Environment:**

- Node.js - For TypeScript/JavaScript applications (AI service, Dashboard, Convex functions)
- Docker - Containerization for various services (AI service, Crawler, Ollama, n8n, ComfyUI)

**Package Manager:**

- pnpm@10.28.0
- Lockfile: present (pnpm-lock.yaml)

## Frameworks

**Core:**

- Hono 4.6.14 - Backend web framework (apps/ai-service)
- Next.js - Frontend web framework (apps/dashboard)
- Convex 1.31.4 - Realtime backend as a service, database, and functions (convex/, root dependency)
- Swift/UIKit - iOS app framework (apps/ios)

**Testing:**

- Vitest - Unit and integration testing for dashboard (apps/dashboard)

**Build/Dev:**

- Nx 22.3.3 - Monorepo management, build system
- tsx - TypeScript execution in development (apps/ai-service)
- tsc - TypeScript compiler
- xcodebuild - iOS app build system (apps/ios)
- Docker Compose - Orchestration for multi-container development/production environments

## Key Dependencies

**Critical (from root package.json):**

- @auth/core 0.37.4 - Authentication
- @convex-dev/auth 0.0.90 - Convex authentication integration
- convex 1.31.4 - Convex client/SDK
- jose 6.1.3 - JSON Object Signing and Encryption
- tencentcloud-sdk-nodejs 4.1.171 - Tencent Cloud services integration

**Critical (from apps/ai-service/package.json):**

- @hono/node-server 1.13.7 - Hono server adapter for Node.js
- @modelcontextprotocol/sdk 1.25.3 - Model Context Protocol SDK (likely for LLM interactions)
- @langchain/anthropic 1.3.10 - Langchain integration with Anthropic LLMs
- @langchain/core 1.1.15 - Core Langchain library
- @langchain/ollama 1.2.0 - Langchain integration with Ollama LLMs
- @langchain/openai 1.2.2 - Langchain integration with OpenAI LLMs
- pdfkit 0.16.0 - PDF document generation
- zod 4.3.5 - Schema validation

**Critical (from apps/dashboard/package.json):**

- @ai-sdk/react 3.0.44 - AI SDK for React (for AI chat features)
- @tanstack/react-query 5.64.2 - Data fetching and caching
- ai 6.0.42 - AI library (likely for common AI utilities)
- lucide-react 0.468.0 - Icon library
- motion 12.27.5 - Animation library
- shiki 3.21.0 - Code syntax highlighter
- tailwindcss 4.1.10 - Utility-first CSS framework

## Configuration

**Environment:**

- Environment variables configured via `.env` files (e.g., `.env.example`, `.env.local`)
- Key environment variables: `CONVEX_URL`, `AMAP_API_KEY`, `OVERPASS_API_URL`, `OLLAMA_BASE_URL`, `N8N_BASE_URL`, `COMFYUI_BASE_URL`, `SENTRY_DSN`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `N8N_BASIC_AUTH_USER`, `N8N_BASIC_AUTH_PASSWORD`.

**Build:**

- Root `tsconfig.base.json`, `tsconfig.json` in various apps/packages
- `eslint.config.mjs` for linting
- `nx.json` for Nx monorepo configuration
- `docker-compose.dev.yml` and `compose.yml` for container build configurations

## Platform Requirements

**Development:**

- Node.js, pnpm, Docker, Xcode (for iOS development)

**Production:**

- Docker containers deployed to a cloud platform (implied by `ghcr.io` images)

---

_Stack analysis: 2026-01-25_
