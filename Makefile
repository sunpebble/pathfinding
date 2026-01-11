# Pathfinding Development Makefile
.PHONY: dev stop setup health convex api crawler dashboard mobile enrich guides

# Configuration
CONVEX_URL ?= https://convex.kunish.org
CONVEX_ADMIN_KEY ?= convex-self-hosted|012aa1ae784acd9fb6c9ef5f0250acf0210b6151b34f4642bd31f95b7a91475af03848dab4
OLLAMA_URL ?= https://ol.svc.kunish.org
OLLAMA_MODEL ?= gemma3:latest

help:
	@echo "Usage: make <command>"
	@echo ""
	@echo "Commands:"
	@echo "  dev        Start all services"
	@echo "  stop       Stop all services"
	@echo "  setup      Setup env files"
	@echo "  health     Check service health"
	@echo "  mobile     Start iOS app"
	@echo "  enrich ID= Enrich a guide"
	@echo "  guides     List guides"

setup:
	@echo "📋 Setting up environment..."
	@test -f .env.local || (echo "CONVEX_SELF_HOSTED_URL='$(CONVEX_URL)'\nCONVEX_SELF_HOSTED_ADMIN_KEY='$(CONVEX_ADMIN_KEY)'\nCONVEX_URL=$(CONVEX_URL)" > .env.local && echo "  ✓ Created .env.local")
	@test -f apps/crawler/.env || (echo "CONVEX_URL=$(CONVEX_URL)\nOLLAMA_BASE_URL=$(OLLAMA_URL)\nOLLAMA_MODEL=$(OLLAMA_MODEL)" > apps/crawler/.env && echo "  ✓ Created apps/crawler/.env")
	@test -f apps/api/.env || (echo "CONVEX_URL=$(CONVEX_URL)" > apps/api/.env && echo "  ✓ Created apps/api/.env")
	@echo "✅ Done"

dev: setup
	@echo "🚀 Starting all services..."
	@npx convex dev &
	@sleep 2
	@cd apps/api && pnpm dev &
	@cd apps/crawler && pnpm dev &
	@cd apps/dashboard && pnpm dev --port 3002 &
	@sleep 5
	@make health
	@echo ""
	@echo "✅ All services running"
	@echo "📍 API=8000 | Crawler=3001 | Dashboard=3002"
	@echo "📱 Mobile: make mobile"
	@echo ""
	@echo "Press Ctrl+C to stop."
	@wait

health:
	@echo "🏥 Health Check:"
	@curl -sf http://localhost:8000/health > /dev/null && echo "  ✓ API (8000)" || echo "  ✗ API"
	@curl -sf http://localhost:3001/health > /dev/null && echo "  ✓ Crawler (3001)" || echo "  ✗ Crawler"
	@curl -sf http://localhost:3002 > /dev/null && echo "  ✓ Dashboard (3002)" || echo "  ✗ Dashboard"

stop:
	@echo "🛑 Stopping all services..."
	@-pkill -f "convex dev" 2>/dev/null || true
	@-pkill -f "tsx watch" 2>/dev/null || true
	@-pkill -f "next dev" 2>/dev/null || true
	@-lsof -ti:8000 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:3001 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:3002 | xargs kill -9 2>/dev/null || true
	@echo "✅ All services stopped"

convex:
	npx convex dev

api:
	cd apps/api && pnpm dev

crawler:
	cd apps/crawler && pnpm dev

dashboard:
	cd apps/dashboard && pnpm dev --port 3002

mobile:
	cd apps/mobile && flutter run -d iPhone

enrich:
	@curl -X POST "http://localhost:3001/api/guides/$(ID)/enrich" | jq

guides:
	@curl -s "http://localhost:3001/api/guides?limit=10" | jq '.data[] | {id, title}'
