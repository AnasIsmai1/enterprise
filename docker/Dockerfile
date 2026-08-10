# =============================================================================
# PRODUCTION DOCKERFILE - Multi-stage build (pnpm)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: base - pnpm via corepack, shared by every later stage
# -----------------------------------------------------------------------------
FROM node:22-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# -----------------------------------------------------------------------------
# Stage 2: build - full dependency tree, compile with SWC
# -----------------------------------------------------------------------------
FROM base AS build

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

# -----------------------------------------------------------------------------
# Stage 3: prod-deps - production dependencies only
# -----------------------------------------------------------------------------
FROM base AS prod-deps

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod

# -----------------------------------------------------------------------------
# Stage 4: run - minimal production image
# -----------------------------------------------------------------------------
FROM node:22-alpine AS run

LABEL org.opencontainers.image.source=https://github.com/EagleAnalytix/enterprise
LABEL org.opencontainers.image.description="Enterprise API - Production"
LABEL org.opencontainers.image.licenses=MIT

WORKDIR /app

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY docker/entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 5500

ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/entrypoint.sh"]
