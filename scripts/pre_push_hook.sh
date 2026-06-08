#!/usr/bin/env bash
# =============================================================================
# FitNova AI — Git Pre-Push Hook
# =============================================================================
# Automatically runs the deployment safety checks before every `git push`.
# If any check fails, the push is ABORTED.
#
# Installation (already done by install_hooks.py):
#   Copy this file to .git/hooks/pre-push and make it executable.
#
# To skip in an emergency (NOT recommended):
#   git push --no-verify
# =============================================================================

set -euo pipefail

# Resolve paths
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${HOOK_DIR}/../.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   FitNova AI — Pre-Push Safety Check        ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

FAILED=0

# ---------------------------------------------------------------------------
# 1. Dependency coverage check
# ---------------------------------------------------------------------------
echo "▶  Step 1/4 — Checking dependency coverage..."
if (cd "${BACKEND_DIR}" && python check_deps.py --root app --requirements requirements.txt); then
    echo "✅  Dependency check passed"
else
    echo "❌  Dependency check FAILED — push blocked"
    FAILED=1
fi

echo ""

# ---------------------------------------------------------------------------
# 2. pip install verification
# ---------------------------------------------------------------------------
echo "▶  Step 2/4 — Verifying pip install..."
if (cd "${BACKEND_DIR}" && pip install -r requirements.txt --quiet); then
    echo "✅  pip install passed"
else
    echo "❌  pip install FAILED — push blocked"
    FAILED=1
fi

echo ""

# ---------------------------------------------------------------------------
# 3. API tests
# ---------------------------------------------------------------------------
echo "▶  Step 3/4 — Running test_api.py..."
if (cd "${BACKEND_DIR}" && python test_api.py); then
    echo "✅  test_api.py passed"
else
    echo "❌  test_api.py FAILED — push blocked"
    FAILED=1
fi

echo ""

# ---------------------------------------------------------------------------
# 4. Workout tests
# ---------------------------------------------------------------------------
echo "▶  Step 4/4 — Running test_workouts.py..."
if (cd "${BACKEND_DIR}" && python test_workouts.py); then
    echo "✅  test_workouts.py passed"
else
    echo "❌  test_workouts.py FAILED — push blocked"
    FAILED=1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "${FAILED}" -gt 0 ]; then
    echo "🚫  Push BLOCKED — fix all failing checks first."
    echo "   Run: bash scripts/pre_deploy.sh"
    echo ""
    exit 1
fi

echo "🚀  All checks passed — pushing to remote."
echo ""
exit 0
