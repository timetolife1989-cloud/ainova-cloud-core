# ============================================================
# Ainova Cloud Core — Multi-stage Dockerfile
# Stage 1: builder  (installs deps + builds Next.js)
# Stage 2: runner   (lean production image)
# ============================================================

# ---- Stage 1: builder ----
FROM node:22-slim AS builder

WORKDIR /app

# Copy dependency manifests first (cache layer)
COPY package.json package-lock.json ./

# Install ALL deps (including devDeps needed for build)
RUN npm ci

# Copy source
COPY . .

# Build Next.js production bundle
ENV NODE_ENV=production
RUN npm run build

# ---- Stage 2: runner ----
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy built artifacts from builder
COPY --from=builder /app/public         ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static   ./.next/static

# Upload dir (can be overridden via volume mount)
RUN mkdir -p /ainova-uploads && chown nextjs:nodejs /ainova-uploads
ENV UPLOAD_DIR=/ainova-uploads

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# next start uses the standalone server
CMD ["node", "server.js"]
