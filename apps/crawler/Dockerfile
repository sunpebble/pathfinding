# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY nx.json ./

# Copy packages
COPY packages/types ./packages/types
COPY packages/constants ./packages/constants
COPY packages/utils ./packages/utils
COPY packages/crawler-types ./packages/crawler-types

# Copy crawler app
COPY apps/crawler ./apps/crawler

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages and crawler
RUN pnpm nx build crawler

# Production stage
FROM node:20-alpine AS runner

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# Install Playwright dependencies for Crawlee
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  freetype-dev \
  harfbuzz \
  ca-certificates \
  ttf-freefont

# Set Playwright to use system Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy production dependencies
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./

# Copy built packages
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/constants/dist ./packages/constants/dist
COPY --from=builder /app/packages/constants/package.json ./packages/constants/
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder /app/packages/utils/package.json ./packages/utils/
COPY --from=builder /app/packages/crawler-types/dist ./packages/crawler-types/dist
COPY --from=builder /app/packages/crawler-types/package.json ./packages/crawler-types/

# Copy crawler app
COPY --from=builder /app/apps/crawler/dist ./apps/crawler/dist
COPY --from=builder /app/apps/crawler/package.json ./apps/crawler/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the server
WORKDIR /app/apps/crawler
CMD ["node", "dist/index.js"]
