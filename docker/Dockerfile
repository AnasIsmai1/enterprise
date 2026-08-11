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

# --ignore-scripts is required, not an optimisation: the `prepare` lifecycle
# script runs husky, which is a devDependency and therefore absent from a --prod
# install, so the install exits non-zero without it. Skipping lifecycle scripts
# in a production install is the right default anyway — nothing here needs to
# compile at install time.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --ignore-scripts

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

# Self-describing for anything consuming this image outside our compose/stack
# files. 127.0.0.1 rather than localhost: on Alpine localhost may resolve to
# ::1 while the app binds IPv4.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:5500/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/entrypoint.sh"]
