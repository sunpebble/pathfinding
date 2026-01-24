# External Integrations

**Analysis Date:** 2026-01-25

## APIs & External Services

**Mapping/Location:**

- Amap API - Used for geographical data and services
  - Connection: `AMAP_API_KEY` environment variable
- Overpass API - OpenStreetMap data queries
  - Connection: `OVERPASS_API_URL` environment variable

**LLM & AI Services:**

- Ollama - Local LLM for content extraction and summarization
  - Connection: `OLLAMA_BASE_URL` environment variable (e.g., `http://ollama:11434`)
  - SDK/Client: `@langchain/ollama`
- Anthropic LLMs - Integrated via Langchain for AI interactions
  - SDK/Client: `@langchain/anthropic`
- OpenAI LLMs - Integrated via Langchain for AI interactions
  - SDK/Client: `@langchain/openai`
- Model Context Protocol SDK - `apps/ai-service` uses `@modelcontextprotocol/sdk` for unknown AI model interactions.

**Workflow Automation:**

- n8n - Workflow automation for crawl scheduling and notifications
  - Connection: `N8N_BASE_URL` environment variable (e.g., `http://n8n:5678`)
  - Auth: `N8N_BASIC_AUTH_USER`, `N8N_BASIC_AUTH_PASSWORD`, `N8N_API_KEY` environment variables

**Image Generation:**

- ComfyUI - AI image generation for travel guide illustrations
  - Connection: `COMFYUI_BASE_URL` environment variable (e.g., `http://comfyui:8188`)

**Cloud Services:**

- Tencent Cloud - SDK `tencentcloud-sdk-nodejs` found in root `package.json`, suggesting integration with Tencent Cloud services (specific usage not detailed by current analysis).

## Data Storage

**Databases:**

- Convex - Realtime backend as a service, including database functionality.
  - Connection: `CONVEX_URL` environment variable
  - Client: `convex` npm package, `@convex-dev/auth` for authentication.

**File Storage:**

- Docker Volumes - Used for persistent storage across various services:
  - `crawler-storage`: For `apps/ai-service` (crawler) data.
  - `ollama-models`: For Ollama LLM models.
  - `n8n-data`: For n8n workflow data.
  - `comfyui-data`, `comfyui-output`: For ComfyUI data and generated output.

**Caching:**

- Not explicitly detected, but Convex and `@tanstack/react-query` likely handle some forms of data caching.

## Authentication & Identity

**Auth Provider:**

- `@auth/core` - General authentication framework.
- `@convex-dev/auth` - Specific integration with Convex for authentication.
  - Implementation: Likely uses JWT or similar token-based authentication with Convex.

## Monitoring & Observability

**Error Tracking:**

- Sentry - Error tracking and performance monitoring.
  - Connection: `SENTRY_DSN` environment variable.

**Logs:**

- OpenTelemetry (OTEL) - For collecting traces, metrics, and logs.
  - Exporter: `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable.
- Console logging: Standard console output from Node.js applications.

## CI/CD & Deployment

**Hosting:**

- Docker-based deployment using `docker-compose.dev.yml` for development and `compose.yml` for production.
- Docker images hosted on `ghcr.io` (GitHub Container Registry).

**CI Pipeline:**

- Not explicitly defined in the provided `docker-compose` files or `package.json` scripts, but the presence of `ghcr.io` suggests a CI/CD process that builds and pushes Docker images.

## Environment Configuration

**Required env vars:**

- `CONVEX_URL`
- `AMAP_API_KEY`
- `OVERPASS_API_URL`
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL`
- `N8N_BASE_URL`, `N8N_API_KEY`, `N8N_BASIC_AUTH_USER`, `N8N_BASIC_AUTH_PASSWORD`, `N8N_ENCRYPTION_KEY`
- `COMFYUI_BASE_URL`
- `SENTRY_DSN`
- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `LOG_LEVEL`, `NODE_ENV`

**Secrets location:**

- Stored as environment variables, likely loaded from `.env` files locally and managed by the deployment environment in production.

## Webhooks & Callbacks

**Incoming:**

- n8n is a workflow automation tool, likely configured to receive webhooks to trigger workflows.
- Convex functions can expose HTTP endpoints that act as webhooks.

**Outgoing:**

- n8n can be configured to send webhooks as part of its workflows.
- `apps/ai-service` might trigger external services via API calls based on its functionality.

---

_Integration audit: 2026-01-25_
