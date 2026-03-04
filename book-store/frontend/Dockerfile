# ── Build stage: use Bun to install deps and build the Vite app ────────────────
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copy manifests first for layer caching
COPY package.json ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

COPY . .
RUN bun run build

# ── Runtime stage: serve built assets with nginx ───────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx runs as root by default; restrict permissions on html dir
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
