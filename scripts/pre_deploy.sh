#!/usr/bin/env bash
# =============================================================================
# FitNova AI — Pre-Deployment Safety Script
# =============================================================================
# Runs all safety checks that must pass before a deployment or merge:
#   1. Dependency coverage check  (check_deps.py)
#   2. pip install verification   (ensures requirements.txt is installable)
#   3. API integration tests      (test_api.py)
#   4. Workout integration tests  (test_workouts.py)
#
# Usage:
#   bash scripts/pre_deploy.sh
#
# Exit codes:
#   0  All checks passed — safe to deploy.
#   1  One or more checks failed — deployment blocked.
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'  # No Color

PASS=0
FAIL=0
STEP=0

step_header() {
    STEP=$((STEP + 1))
    echo ""
    echo -e "${CYAN}${BOLD}━━━ Step ${STEP}: ${1} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

ok() {
    echo -e "${GREEN}✅  PASS${NC} — ${1}"
    PASS=$((PASS + 1))
}

fail() {
    echo -e "${RED}❌  FAIL${NC} — ${1}"
    FAIL=$((FAIL + 1))
}

warn() {
    echo -e "${YELLOW}⚠️   WARN${NC} — ${1}"
}

# ---------------------------------------------------------------------------
# Resolve backend directory (works from repo root OR backend/)
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"

if [ ! -f "${BACKEND_DIR}/requirements.txt" ]; then
    echo -e "${RED}[ERROR] Cannot find backend/requirements.txt. Run from repo root.${NC}"
    exit 1
fi

cd "${BACKEND_DIR}"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   FitNova AI — Pre-Deployment Safety Check  ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo "  Backend: ${BACKEND_DIR}"
echo "  Date   : $(date '+%Y-%m-%d %H:%M:%S')"

# ---------------------------------------------------------------------------
# Step 1: Dependency Coverage Check
# ---------------------------------------------------------------------------
step_header "Dependency Coverage (check_deps.py)"

if python check_deps.py --root app --requirements requirements.txt; then
    ok "All third-party imports are declared in requirements.txt"
else
    fail "Missing packages detected in requirements.txt — add them before deploying"
fi

# ---------------------------------------------------------------------------
# Step 2: pip install verification
# ---------------------------------------------------------------------------
step_header "pip install -r requirements.txt"

if pip install -r requirements.txt --quiet; then
    ok "All packages installed successfully"
else
    fail "pip install failed — requirements.txt may contain an invalid or conflicting package"
fi

# ---------------------------------------------------------------------------
# Step 3: API Integration Tests
# ---------------------------------------------------------------------------
step_header "API Integration Tests (test_api.py)"

if python test_api.py; then
    ok "test_api.py passed"
else
    fail "test_api.py failed — fix API tests before deploying"
fi

# ---------------------------------------------------------------------------
# Step 4: Workout Integration Tests
# ---------------------------------------------------------------------------
step_header "Workout Integration Tests (test_workouts.py)"

if python test_workouts.py; then
    ok "test_workouts.py passed"
else
    fail "test_workouts.py failed — fix workout tests before deploying"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  Results: ${GREEN}${PASS} passed${NC}  ${RED}${FAIL} failed${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "${FAIL}" -gt 0 ]; then
    echo ""
    echo -e "${RED}${BOLD}🚫  PRE-DEPLOY CHECK FAILED — deployment blocked.${NC}"
    echo "   Fix all failing steps and re-run: bash scripts/pre_deploy.sh"
    echo ""
    exit 1
else
    echo ""
    echo -e "${GREEN}${BOLD}🚀  All checks passed — safe to deploy.${NC}"
    echo ""
    exit 0
fi
