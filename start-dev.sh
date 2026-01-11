#!/bin/bash
# ==============================================================================
# Pathfinding Development Startup Script
# One-click script to start all services for local development
# ==============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Pathfinding Development Environment${NC}\n"

# ==============================================================================
# Environment Check
# ==============================================================================
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${YELLOW}📋 Checking required environment variables...${NC}"

# Required for Crawler to connect to Convex
if [ -z "$CONVEX_URL" ] && [ ! -f "apps/crawler/.env" ]; then
  echo -e "${YELLOW}⚠️  CONVEX_URL not set. Creating apps/crawler/.env...${NC}"
  echo "CONVEX_URL=https://convex.kunish.org" > apps/crawler/.env
fi

echo -e "${GREEN}✅ Environment check complete${NC}\n"

# ==============================================================================
# Required Environment Variables Reference
# ==============================================================================
cat << 'EOF'
┌─────────────────────────────────────────────────────────────────────┐
│                    Required Environment Variables                   │
├─────────────────────────────────────────────────────────────────────┤
│  apps/crawler/.env:                                                 │
│    CONVEX_URL=https://convex.kunish.org                            │
│                                                                     │
│  AI Services (Optional - using defaults):                          │
│    OLLAMA_BASE_URL=https://ol.svc.kunish.org                       │
│    OLLAMA_MODEL=gemma3:latest                                      │
│                                                                     │
│  Nominatim Geocoding: Free, no API key required                    │
└─────────────────────────────────────────────────────────────────────┘
EOF

echo ""

# ==============================================================================
# Start Services
# ==============================================================================

# Function to start a service in a new terminal tab (macOS)
start_service() {
  local name=$1
  local dir=$2
  local cmd=$3
  
  echo -e "${BLUE}Starting ${name}...${NC}"
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS: use AppleScript to open new Terminal tab
    osascript -e "tell application \"Terminal\"
      do script \"cd '$SCRIPT_DIR/$dir' && $cmd\"
    end tell" 2>/dev/null || {
      # Fallback: run in background
      (cd "$dir" && eval "$cmd" &)
    }
  else
    # Linux: run in background
    (cd "$dir" && eval "$cmd" &)
  fi
}

echo -e "${YELLOW}🔧 Starting services in background...${NC}\n"

# 1. Convex Dev
echo -e "${BLUE}[1/5] Starting Convex Dev Server...${NC}"
(npx convex dev 2>&1 | sed 's/^/[Convex] /' &)
sleep 2

# 2. API Server
echo -e "${BLUE}[2/5] Starting API Server (port 8000)...${NC}"
(cd apps/api && pnpm dev 2>&1 | sed 's/^/[API] /' &)
sleep 1

# 3. Crawler Service
echo -e "${BLUE}[3/5] Starting Crawler Service (port 3001)...${NC}"
(cd apps/crawler && pnpm dev 2>&1 | sed 's/^/[Crawler] /' &)
sleep 1

# 4. Dashboard
echo -e "${BLUE}[4/5] Starting Dashboard (port 3002)...${NC}"
(cd apps/dashboard && pnpm dev --port 3002 2>&1 | sed 's/^/[Dashboard] /' &)
sleep 1

# 5. Wait for services to be ready
echo -e "\n${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 5

# Health checks
echo -e "\n${YELLOW}🏥 Running health checks...${NC}"
curl -s http://localhost:8000/health > /dev/null && echo -e "${GREEN}  ✓ API (8000)${NC}" || echo "  ✗ API"
curl -s http://localhost:3001/health > /dev/null && echo -e "${GREEN}  ✓ Crawler (3001)${NC}" || echo "  ✗ Crawler"
curl -s http://localhost:3002 > /dev/null && echo -e "${GREEN}  ✓ Dashboard (3002)${NC}" || echo "  ✗ Dashboard"

echo -e "\n${GREEN}══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All services started!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════════════════${NC}"

cat << 'EOF'

📍 Service URLs:
   • Convex Dashboard: https://convex.kunish.org
   • API Server:       http://localhost:8000
   • Crawler API:      http://localhost:3001
   • Dashboard:        http://localhost:3002

📱 To start Mobile App:
   cd apps/mobile && flutter run -d iPhone

🤖 AI Enrichment API:
   POST http://localhost:3001/api/guides/{id}/enrich

Press Ctrl+C to stop all services.
EOF

# Keep script running
wait
