#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# test-samples.sh — End-to-end test: POST sample images to the ai-api /recognize
#
# Usage (from the app/ directory, next to docker-compose.yml):
#   ./test-samples.sh
#   ./test-samples.sh http://localhost:8000   # explicit URL override
#
# The script reads AI_API_PORT (and other vars) from the .env file in the
# same directory as this script (i.e. app/.env), which is the same file
# used by docker-compose.yml.
#
# Requirements:
#   - curl, jq
#   - The ai-api container must be running: docker compose up ai-api
#
# Each samples/sampleN/ folder is treated as ONE book.
# All images in a folder are posted together in a single multipart request
# so the model can see all views simultaneously (cover + back cover, etc.).
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Locate the app/ directory (where this script lives) ──────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
SAMPLES_DIR="${SCRIPT_DIR}/ai-api/samples"
OUTPUT_DIR="${SCRIPT_DIR}/ai-api/output"

# ── Load .env ─────────────────────────────────────────────────────────────────
if [[ -f "$ENV_FILE" ]]; then
  # Export only KEY=VALUE lines; skip comments and blank lines
  set -o allexport
  # shellcheck source=/dev/null
  source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE")
  set +o allexport
  echo "Loaded env from ${ENV_FILE}"
else
  echo "Warning: ${ENV_FILE} not found — using defaults (copy .env.example to .env)"
fi

# ── Determine API endpoint ────────────────────────────────────────────────────
# CLI arg overrides env; env overrides default
_DEFAULT_PORT="${AI_API_PORT:-8000}"
API_URL="${1:-http://localhost:${_DEFAULT_PORT}}"
ENDPOINT="${API_URL}/recognize"
RESULTS_FILE="${OUTPUT_DIR}/e2e_test_results.json"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

hr() { printf '%s\n' "$(printf '─%.0s' {1..60})"; }

require() {
  command -v "$1" &>/dev/null || {
    echo -e "${RED}❌  '$1' is required but not found.${NC}"
    exit 1
  }
}

# ── Preflight ─────────────────────────────────────────────────────────────────
require curl
require jq

mkdir -p "$OUTPUT_DIR"

echo -e "\n${BOLD}Book Store AI API — End-to-End Sample Test${NC}"
echo -e "Endpoint : ${CYAN}${ENDPOINT}${NC}"
echo -e "Samples  : ${CYAN}${SAMPLES_DIR}${NC}"
hr

# ── Health check ──────────────────────────────────────────────────────────────
echo -e "\n${BOLD}Health check …${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health" || true)
if [[ "$HTTP_STATUS" != "200" ]]; then
  echo -e "${RED}❌  API not reachable at ${API_URL} (HTTP ${HTTP_STATUS})${NC}"
  echo    "   Start the server: docker compose up ai-api"
  echo    "   Or locally:       cd ai-api && python api.py"
  exit 1
fi
echo -e "${GREEN}✓  API is up (HTTP 200)${NC}"

# ── Collect sample folders ────────────────────────────────────────────────────
mapfile -t SAMPLE_DIRS < <(find "$SAMPLES_DIR" -mindepth 1 -maxdepth 1 -type d | sort)

if [[ ${#SAMPLE_DIRS[@]} -eq 0 ]]; then
  echo -e "${YELLOW}⚠  No sample folders found in ${SAMPLES_DIR}${NC}"
  exit 0
fi

echo -e "\nFound ${#SAMPLE_DIRS[@]} sample book(s): $(basename -a "${SAMPLE_DIRS[@]}" | tr '\n' ' ')\n"

# ── Run tests ─────────────────────────────────────────────────────────────────
ALL_RESULTS="{}"
PASS=0
FAIL=0

for SAMPLE_DIR in "${SAMPLE_DIRS[@]}"; do
  SAMPLE_NAME="$(basename "$SAMPLE_DIR")"
  hr
  echo -e "${BOLD}Sample: ${SAMPLE_NAME}${NC}"

  # Collect image files
  mapfile -t IMG_FILES < <(find "$SAMPLE_DIR" -maxdepth 1 -type f \( \
    -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp" \
  \) | sort)

  if [[ ${#IMG_FILES[@]} -eq 0 ]]; then
    echo -e "${YELLOW}  ⚠  No images found — skipping${NC}"
    continue
  fi

  echo -e "  Images (${#IMG_FILES[@]} total — all represent ONE book):"
  for f in "${IMG_FILES[@]}"; do
    SIZE_KB=$(( $(wc -c < "$f") / 1024 ))
    echo    "    • $(basename "$f") (${SIZE_KB} KB)"
  done
  echo

  # Build curl -F arguments — one per image file
  CURL_ARGS=()
  for f in "${IMG_FILES[@]}"; do
    CURL_ARGS+=(-F "photos=@${f}")
  done

  # Call the API and capture body + HTTP status code
  START_NS=$(date +%s%N)
  HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" \
    "${CURL_ARGS[@]}" \
    "$ENDPOINT" 2>&1) || true
  END_NS=$(date +%s%N)

  HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -n1)
  BODY=$(echo "$HTTP_RESPONSE" | head -n -1)
  ELAPSED_MS=$(( (END_NS - START_NS) / 1000000 ))

  if [[ "$HTTP_CODE" == "200" ]]; then
    echo -e "  ${GREEN}✅  HTTP 200  (${ELAPSED_MS}ms)${NC}"

    SOURCE=$(echo "$BODY" | jq -r '.source // "unknown"')
    echo -e "  Source : ${CYAN}${SOURCE}${NC}"
    echo    "  Fields :"
    echo "$BODY" | jq -r '
      .data // {} |
      to_entries[] |
      "    \(.key): \(if .value == null then "null" else (.value | tostring) end)"
    '

    ALL_RESULTS=$(echo "$ALL_RESULTS" | jq \
      --arg name "$SAMPLE_NAME" \
      --argjson result "$(echo "$BODY" | jq --argjson ms "$ELAPSED_MS" '{source: .source, elapsed_ms: $ms, data: .data}')" \
      '. + {($name): $result}')
    PASS=$(( PASS + 1 ))
  else
    echo -e "  ${RED}❌  HTTP ${HTTP_CODE}  (${ELAPSED_MS}ms)${NC}"
    echo    "  Response: $BODY"
    FAIL=$(( FAIL + 1 ))
  fi
done

# ── Summary ───────────────────────────────────────────────────────────────────
hr
echo -e "\n${BOLD}Summary:${NC}  ${GREEN}${PASS} passed${NC}  |  ${RED}${FAIL} failed${NC}"

echo "$ALL_RESULTS" | jq . > "$RESULTS_FILE"
echo -e "Results saved → ${CYAN}${RESULTS_FILE}${NC}\n"

[[ $FAIL -eq 0 ]]  # exit 0 if all passed, 1 if any failed
