#!/usr/bin/env bash
# ── E2E test runner ────────────────────────────────────────────────────────────
# Run from the REPO ROOT:
#   chmod +x tests/e2e-tests.sh
#   ./tests/e2e-tests.sh
#
# Kibana and kibana-init are NOT started — they are dev/observability tools
# that have no role in API integration testing and add ~90 s of startup time.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Starting required stack services (skipping Kibana)..."
docker compose -f app/docker-compose.yml up -d --wait \
  postgres elastic ai-api backend frontend nginx

echo "==> Running e2e tests..."
docker compose \
  -f app/docker-compose.yml \
  -f tests/docker-compose.e2e.yml \
  run --rm --build e2e

echo "==> Done."
