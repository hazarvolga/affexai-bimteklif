#!/usr/bin/env bash
# Deploy gate (DENETIM_RAPORU_2026-10-17 P0-1): refuse to deploy a commit whose "Verify" CI run is not green.
# Usage: scripts/require-green-ci.sh [commit-sha]   (default: HEAD). Requires the GitHub CLI (`gh auth login`).
set -euo pipefail

SHA="${1:-$(git rev-parse HEAD)}"
if ! [[ "$SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Commit SHA must be 40 hex characters: $SHA" >&2
  exit 2
fi

RESULT="$(gh run list --workflow Verify --commit "$SHA" --limit 1 --json status,conclusion -q '.[0] | "\(.status)/\(.conclusion)"' 2>/dev/null || true)"

case "$RESULT" in
  completed/success)
    echo "CI green for $SHA — deploy allowed."
    ;;
  "")
    echo "No Verify run found for $SHA. Push the commit and wait for CI before deploying." >&2
    exit 1
    ;;
  *)
    echo "Verify is '$RESULT' for $SHA — deploy blocked. Fix CI first." >&2
    exit 1
    ;;
esac
