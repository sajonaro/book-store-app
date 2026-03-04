# ── Build stage ────────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS deps
WORKDIR /app

# Copy only the manifest so layer is cached unless deps change
COPY package.json ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy installed modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY backend/ ./backend/

# Drop to non-root user
USER appuser

EXPOSE 5555

ENV NODE_ENV=production

CMD ["bun", "run", "backend/index.js"]
