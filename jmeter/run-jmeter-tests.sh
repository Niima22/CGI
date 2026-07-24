#!/usr/bin/env bash
set -euo pipefail

JMETER_BIN="${JMETER_BIN:-jmeter}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORTS_DIR="$SCRIPT_DIR/reports"
RESULTS_DIR="$REPORTS_DIR/results"
HTML_DIR="$REPORTS_DIR/html"

mkdir -p "$RESULTS_DIR" "$HTML_DIR"
rm -rf "$HTML_DIR/tickets" "$HTML_DIR/quality-lab"

timestamp="$(date +%Y%m%d-%H%M%S)"

COMMON_PROPS=(
  "-Jjmeter.reportgenerator.overall_granularity=1000"
)

TICKET_PROPS=(
  "-Jgateway.protocol=${GATEWAY_PROTOCOL:-http}"
  "-Jgateway.host=${GATEWAY_HOST:-localhost}"
  "-Jgateway.port=${GATEWAY_PORT:-8080}"
  "-Jtickets.path=${TICKETS_PATH:-/api/tickets}"
  "-Jkeycloak.protocol=${KEYCLOAK_PROTOCOL:-http}"
  "-Jkeycloak.host=${KEYCLOAK_HOST:-localhost}"
  "-Jkeycloak.port=${KEYCLOAK_PORT:-8085}"
  "-Jkeycloak.realm=${KEYCLOAK_REALM:-cgi-flow}"
  "-Jkeycloak.client_id=${KEYCLOAK_CLIENT_ID:-cgi-flow-web}"
  "-Jkeycloak.username=${KEYCLOAK_USERNAME:-agent@cgi.local}"
  "-Jkeycloak.password=${KEYCLOAK_PASSWORD:-change-me}"
  "-Jticket.department_id=${TICKET_DEPARTMENT_ID:-1}"
  "-Jticket.loops=${TICKET_LOOPS:-1}"
  "-Jticket.kpi.max_ms=${TICKET_KPI_MAX_MS:-3000}"
)

QUALITY_PROPS=(
  "-Jquality.protocol=${QUALITY_PROTOCOL:-http}"
  "-Jquality.host=${QUALITY_HOST:-localhost}"
  "-Jquality.port=${QUALITY_PORT:-8001}"
  "-Jquality.path=${QUALITY_PATH:-/generate-resolution-frame}"
  "-Jquality.loops=${QUALITY_LOOPS:-1}"
  "-Jquality.kpi.max_ms=${QUALITY_KPI_MAX_MS:-5000}"
)

run_plan() {
  local name="$1"
  local plan="$2"
  local result="$3"
  local html="$4"
  shift 4

  echo "Running $name..."
  "$JMETER_BIN" -n -t "$plan" -l "$result" -e -o "$html" "${COMMON_PROPS[@]}" "$@"
}

tickets_jtl="$RESULTS_DIR/tickets-$timestamp.jtl"
quality_jtl="$RESULTS_DIR/quality-lab-$timestamp.jtl"

run_plan \
  "tickets load test" \
  "$SCRIPT_DIR/test-plan-tickets.jmx" \
  "$tickets_jtl" \
  "$HTML_DIR/tickets" \
  "${TICKET_PROPS[@]}"

run_plan \
  "quality lab latency test" \
  "$SCRIPT_DIR/test-plan-quality-lab.jmx" \
  "$quality_jtl" \
  "$HTML_DIR/quality-lab" \
  "${QUALITY_PROPS[@]}"

echo "JMeter reports generated:"
echo "  Tickets JTL:      $tickets_jtl"
echo "  Tickets HTML:     $HTML_DIR/tickets/index.html"
echo "  Quality Lab JTL:  $quality_jtl"
echo "  Quality Lab HTML: $HTML_DIR/quality-lab/index.html"
