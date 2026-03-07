# ============================================================
# Ainova Cloud Core — Multi-stage Dockerfile
# Stage 1: builder  (installs deps + builds Next.js)
# Stage 2: runner   (lean production image, auto-migrates on start)
# ============================================================

# ---- Stage 1: builder ----
FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
RUN npm run build

# ---- Stage 2: runner ----
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Next.js standalone build
COPY --from=builder /app/public           ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static     ./.next/static

# Migration script + SQL files (plain JS, no tsx needed)
COPY --from=builder /app/scripts/migrate-all.js ./scripts/migrate-all.js
COPY --from=builder /app/database               ./database

# mssql is in standalone node_modules already (runtime dep)
# but migrate-all.js needs it at require() time — verify it's there:
RUN node -e "require('mssql')" 2>/dev/null || npm install --no-save mssql

# Upload dir
RUN mkdir -p /ainova-uploads && chown nextjs:nodejs /ainova-uploads
ENV UPLOAD_DIR=/ainova-uploads

# Entrypoint: migrate first, then start server
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["./docker-entrypoint.sh"]
