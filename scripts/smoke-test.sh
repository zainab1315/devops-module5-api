#!/usr/bin/env bash
# Smoke test every endpoint. Exits non-zero on the first failure.
# Usage:  ./scripts/smoke-test.sh [base-url]

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
FAILED=0

check() {
  local name="$1" path="$2" expected="$3"

  if curl -fsS "${BASE_URL}${path}" | grep -q "${expected}"; then
    printf '  PASS  %-22s %s\n' "$name" "$path"
  else
    printf '  FAIL  %-22s %s\n' "$name" "$path"
    FAILED=1
  fi
}

echo "Smoke testing ${BASE_URL}"
echo ""

check "root"          "/"            "REST API is running"
check "health"        "/health"      '"status":"ok"'
check "ready"         "/health/ready" '"status":"ready"'
check "health detail" "/health/detail" "nodeVersion"
check "items list"    "/api/items"   '"count"'
check "item by id"    "/api/items/1" "Deploy Pipeline"
check "metrics"       "/metrics"     "api_http_requests_total"

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "All checks passed."
else
  echo "One or more checks failed."
  exit 1
fi
