# ── Build stage: install dependencies ─────────────────────────────────────────
FROM oven/bun:1-alpine AS deps
WORKDIR /app

# Copy only the manifest so this layer is cached unless deps change
COPY package.json ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS runner
WORKDIR /app

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy installed modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source (build context is ./backend, so . = backend/)
COPY . .

# Drop to non-root user
USER appuser

EXPOSE 5555

ENV NODE_ENV=production

CMD ["bun", "run", "index.js"]
