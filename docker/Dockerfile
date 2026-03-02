# =============================================================================
# PRODUCTION DOCKERFILE - Multi-stage build
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: deps - Install all dependencies for building
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2: build - Compile TypeScript to JavaScript
# -----------------------------------------------------------------------------
FROM deps AS build

WORKDIR /app

COPY . .

RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: run - Minimal production image
# -----------------------------------------------------------------------------
FROM node:20-alpine AS run

LABEL org.opencontainers.image.source=https://github.com/EagleAnalytix/enterprise
LABEL org.opencontainers.image.description="Enterprise API - Production"
LABEL org.opencontainers.image.licenses=MIT

WORKDIR /app

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY docker/entrypoint.sh /app/entrypoint.sh

RUN npm prune --production

RUN chmod +x /app/entrypoint.sh && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 5500

ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/entrypoint.sh"]
