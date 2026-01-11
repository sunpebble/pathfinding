#!/bin/bash
# ==============================================================================
# Pathfinding Development Startup Script
# One-click script to start all services for local development
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Pathfinding Development Environment${NC}\n"

# ==============================================================================
# Required Configuration
# ==============================================================================
# Modify these values for your environment:

CONVEX_URL=${CONVEX_URL:-"https://convex.kunish.org"}
CONVEX_ADMIN_KEY=${CONVEX_ADMIN_KEY:-"convex-self-hosted|012aa1ae784acd9fb6c9ef5f0250acf0210b6151b34f4642bd31f95b7a91475af03848dab4"}
OLLAMA_BASE_URL=${OLLAMA_BASE_URL:-"https://ol.svc.kunish.org"}
OLLAMA_MODEL=${OLLAMA_MODEL:-"gemma3:latest"}

# ==============================================================================
# Setup Environment Files
# ==============================================================================
setup_env() {
  echo -e "${YELLOW}📋 Setting up environment files...${NC}"
  
  # Root .env.local
  if [ ! -f ".env.local" ]; then
    cat > .env.local << EOF
CONVEX_SELF_HOSTED_URL='${CONVEX_URL}'
CONVEX_SELF_HOSTED_ADMIN_KEY='${CONVEX_ADMIN_KEY}'
CONVEX_URL=${CONVEX_URL}
EOF
    echo -e "${GREEN}  ✓ Created .env.local${NC}"
  fi
  
  # Crawler .env
  if [ ! -f "apps/crawler/.env" ] || ! grep -q "CONVEX_URL" "apps/crawler/.env"; then
    cat > apps/crawler/.env << EOF
CONVEX_URL=${CONVEX_URL}
OLLAMA_BASE_URL=${OLLAMA_BASE_URL}
OLLAMA_MODEL=${OLLAMA_MODEL}
EOF
    echo -e "${GREEN}  ✓ Created apps/crawler/.env${NC}"
  fi
  
  # API .env
  if [ ! -f "apps/api/.env" ]; then
    cat > apps/api/.env << EOF
CONVEX_URL=${CONVEX_URL}
EOF
    echo -e "${GREEN}  ✓ Created apps/api/.env${NC}"
  fi
  
  echo ""
}

# ==============================================================================
# Display Configuration
# ==============================================================================
show_config() {
  cat << EOF
┌─────────────────────────────────────────────────────────────────────┐
│                    Current Configuration                            │
├─────────────────────────────────────────────────────────────────────┤
│  CONVEX_URL:      ${CONVEX_URL}
│  OLLAMA_BASE_URL: ${OLLAMA_BASE_URL}
│  OLLAMA_MODEL:    ${OLLAMA_MODEL}
│                                                                     │
│  To customize, set environment variables before running:            │
│    export CONVEX_URL=https://your-convex.example.com               │
│    export OLLAMA_BASE_URL=https://your-ollama.example.com          │
└─────────────────────────────────────────────────────────────────────┘
EOF
  echo ""
}

# ==============================================================================
# Start Services
# ==============================================================================
start_services() {
  echo -e "${YELLOW}🔧 Starting services...${NC}\n"

  # 1. Convex Dev
  echo -e "${BLUE}[1/4] Convex Dev Server${NC}"
  (npx convex dev 2>&1 | sed 's/^/[Convex] /' &)
  sleep 2

  # 2. API Server
  echo -e "${BLUE}[2/4] API Server (port 8000)${NC}"
  (cd apps/api && pnpm dev 2>&1 | sed 's/^/[API] /' &)
  sleep 1

  # 3. Crawler Service
  echo -e "${BLUE}[3/4] Crawler Service (port 3001)${NC}"
  (cd apps/crawler && pnpm dev 2>&1 | sed 's/^/[Crawler] /' &)
  sleep 1

  # 4. Dashboard
  echo -e "${BLUE}[4/4] Dashboard (port 3002)${NC}"
  (cd apps/dashboard && pnpm dev --port 3002 2>&1 | sed 's/^/[Dashboard] /' &)
  sleep 3
}

# ==============================================================================
# Health Checks
# ==============================================================================
health_check() {
  echo -e "\n${YELLOW}🏥 Health checks...${NC}"
  sleep 2
  curl -s http://localhost:8000/health > /dev/null 2>&1 && echo -e "${GREEN}  ✓ API (8000)${NC}" || echo -e "${RED}  ✗ API${NC}"
  curl -s http://localhost:3001/health > /dev/null 2>&1 && echo -e "${GREEN}  ✓ Crawler (3001)${NC}" || echo -e "${RED}  ✗ Crawler${NC}"
  curl -s http://localhost:3002 > /dev/null 2>&1 && echo -e "${GREEN}  ✓ Dashboard (3002)${NC}" || echo -e "${RED}  ✗ Dashboard${NC}"
  curl -s --max-time 3 "${OLLAMA_BASE_URL}/api/tags" > /dev/null 2>&1 && echo -e "${GREEN}  ✓ Ollama AI${NC}" || echo -e "${YELLOW}  ⚠ Ollama (optional)${NC}"
}

# ==============================================================================
# Main
# ==============================================================================
setup_env
show_config
start_services
health_check

echo -e "\n${GREEN}══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All services started!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════════════════${NC}"

cat << 'EOF'

📍 Service URLs:
   • API Server:       http://localhost:8000
   • Crawler API:      http://localhost:3001
   • Dashboard:        http://localhost:3002

📱 To start Mobile App:
   cd apps/mobile && flutter run -d iPhone

🤖 AI Enrichment:
   curl -X POST http://localhost:3001/api/guides/{id}/enrich

Press Ctrl+C to stop all services.
EOF

wait
