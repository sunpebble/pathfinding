# Pathfinding Development Justfile
# Run `just` to see available commands

set dotenv-load := true

# Default configuration (can be overridden via environment)
export CONVEX_URL := env_var_or_default("CONVEX_URL", "https://convex.kunish.org")
export CONVEX_ADMIN_KEY := env_var_or_default("CONVEX_ADMIN_KEY", "convex-self-hosted|012aa1ae784acd9fb6c9ef5f0250acf0210b6151b34f4642bd31f95b7a91475af03848dab4")
export OLLAMA_BASE_URL := env_var_or_default("OLLAMA_BASE_URL", "https://ol.svc.kunish.org")
export OLLAMA_MODEL := env_var_or_default("OLLAMA_MODEL", "gemma3:latest")

# Show all available commands
default:
    @just --list

# ============================================================================
# Environment Setup
# ============================================================================

# Setup all environment files
setup:
    @echo "📋 Setting up environment files..."
    @[ -f .env.local ] || echo "CONVEX_SELF_HOSTED_URL='{{CONVEX_URL}}'\nCONVEX_SELF_HOSTED_ADMIN_KEY='{{CONVEX_ADMIN_KEY}}'\nCONVEX_URL={{CONVEX_URL}}" > .env.local && echo "  ✓ Created .env.local"
    @[ -f apps/crawler/.env ] || echo "CONVEX_URL={{CONVEX_URL}}\nOLLAMA_BASE_URL={{OLLAMA_BASE_URL}}\nOLLAMA_MODEL={{OLLAMA_MODEL}}" > apps/crawler/.env && echo "  ✓ Created apps/crawler/.env"
    @[ -f apps/api/.env ] || echo "CONVEX_URL={{CONVEX_URL}}" > apps/api/.env && echo "  ✓ Created apps/api/.env"
    @echo "✅ Environment setup complete"

# Show current configuration
config:
    @echo "┌─────────────────────────────────────────────────────────────────┐"
    @echo "│ Current Configuration                                          │"
    @echo "├─────────────────────────────────────────────────────────────────┤"
    @echo "│ CONVEX_URL:      {{CONVEX_URL}}"
    @echo "│ OLLAMA_BASE_URL: {{OLLAMA_BASE_URL}}"
    @echo "│ OLLAMA_MODEL:    {{OLLAMA_MODEL}}"
    @echo "└─────────────────────────────────────────────────────────────────┘"

# ============================================================================
# Development Commands
# ============================================================================

# Start all services (one-click dev)
dev: setup
    @echo "🚀 Starting all services..."
    @just convex &
    @sleep 2
    @just api &
    @just crawler &
    @just dashboard &
    @sleep 5
    @just health

# Start Convex dev server
convex:
    npx convex dev

# Start API server (port 8000)
api:
    cd apps/api && pnpm dev

# Start Crawler service (port 3001)
crawler:
    cd apps/crawler && pnpm dev

# Start Dashboard (port 3002)
dashboard:
    cd apps/dashboard && pnpm dev --port 3002

# Start Mobile app on iOS Simulator
mobile:
    cd apps/mobile && flutter run -d iPhone

# ============================================================================
# Health & Status
# ============================================================================

# Run health checks on all services
health:
    @echo "🏥 Health Checks:"
    @curl -sf http://localhost:8000/health > /dev/null && echo "  ✓ API (8000)" || echo "  ✗ API"
    @curl -sf http://localhost:3001/health > /dev/null && echo "  ✓ Crawler (3001)" || echo "  ✗ Crawler"
    @curl -sf http://localhost:3002 > /dev/null && echo "  ✓ Dashboard (3002)" || echo "  ✗ Dashboard"
    @curl -sf --max-time 3 "{{OLLAMA_BASE_URL}}/api/tags" > /dev/null && echo "  ✓ Ollama" || echo "  ⚠ Ollama (optional)"

# ============================================================================
# AI Enrichment
# ============================================================================

# Enrich a guide with AI (usage: just enrich <guide_id>)
enrich id:
    curl -X POST "http://localhost:3001/api/guides/{{id}}/enrich" | jq

# Batch enrich guides (usage: just enrich-batch [limit])
enrich-batch limit="5":
    curl -X POST -H "Content-Type: application/json" \
        -d '{"limit": {{limit}}}' \
        "http://localhost:3001/api/guides/enrich/batch" | jq

# Get AI data for a guide
ai-data id:
    curl -s "http://localhost:3001/api/guides/{{id}}/ai-data" | jq

# ============================================================================
# Build & Test
# ============================================================================

# Build all packages
build:
    pnpm build

# Run linting
lint:
    pnpm lint

# Run type check
typecheck:
    pnpm typecheck

# Generate Flutter code (freezed, riverpod)
codegen:
    cd apps/mobile && dart run build_runner build --delete-conflicting-outputs

# ============================================================================
# Utilities
# ============================================================================

# Install all dependencies
install:
    pnpm install
    cd apps/mobile && flutter pub get

# Clean all build artifacts
clean:
    pnpm clean
    cd apps/mobile && flutter clean

# List available guides
guides limit="10":
    curl -s "http://localhost:3001/api/guides?limit={{limit}}" | jq '.data[] | {id, title, ai_processed: (.ai_processed_at != null)}'
