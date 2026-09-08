# ==============================================================================
# Production Dockerfile for RecoNepal Backend API Server
# ==============================================================================

# Stage 1: Build & TypeScript Compilation
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code and database migrations
COPY src ./src

# Compile TypeScript to dist/
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Copy SQL migrations for runtime schema validation
COPY --from=builder /app/src/db/migrations ./src/db/migrations
COPY --from=builder /app/src/db/migrations ./dist/db/migrations

# Run as unprivileged node user
USER node

EXPOSE 4000

# Health check against production endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

CMD ["node", "dist/index.js"]
