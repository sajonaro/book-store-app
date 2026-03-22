#!/bin/sh
# init-kibana.sh
# Waits for Kibana to be ready, then imports the saved objects (data view + dashboard).
# This script is run as a one-shot init container that exits after importing.

KIBANA_URL="${KIBANA_URL:-http://kibana:5601}"
SAVED_OBJECTS_FILE="/kibana/saved_objects.ndjson"

echo "Waiting for Kibana to become available at ${KIBANA_URL}..."

MAX_WAIT=120
ELAPSED=0
until curl -sf "${KIBANA_URL}/api/status" | grep -q '"level":"available"'; do
  if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
    echo "ERROR: Kibana did not become available within ${MAX_WAIT}s. Skipping saved objects import."
    exit 0
  fi
  sleep 5
  ELAPSED=$((ELAPSED + 5))
  echo "  Still waiting... (${ELAPSED}s elapsed)"
done

echo "Kibana is ready. Importing saved objects from ${SAVED_OBJECTS_FILE}..."

RESPONSE=$(curl -sf -X POST \
  "${KIBANA_URL}/api/saved_objects/_import?overwrite=true" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: multipart/form-data" \
  --form "file=@${SAVED_OBJECTS_FILE}" \
  2>&1)

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✓ Saved objects imported successfully."
  echo "$RESPONSE"
else
  echo "⚠ Import response (may be partial or already imported):"
  echo "$RESPONSE"
fi

echo "Done."
