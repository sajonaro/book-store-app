# ── Build stage: use Bun to install deps and build the Vite app ────────────────
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copy manifests first for layer caching
COPY package.json ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

COPY . .
RUN bun run build

# ── Export stage: copy built assets to a shared volume for nginx ───────────────
FROM alpine:3.19 AS runner
WORKDIR /dist

COPY --from=builder /app/dist .

# The entrypoint copies the built files into the shared volume mount point
# and then exits — nginx picks them up from the volume
CMD ["sh", "-c", "cp -r /dist/. /usr/share/nginx/html/ && echo 'Frontend assets copied.'"]
