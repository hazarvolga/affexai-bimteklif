#!/usr/bin/env bash
# Release preflight: run before pressing Deploy in Coolify (merging to main never deploys).
# Finds work that would be missing from production: unmerged/unpushed local branches, dirty
# worktrees, open PRs, a non-green main, and how far the live revision is behind main.
# Read-only: it only fetches. It never merges, pushes, deletes or deploys.
# Usage: scripts/release-preflight.sh [--allow-pending]
#   --allow-pending  report findings as warnings and exit 0
# Requires git, curl, jq and the GitHub CLI (`gh auth login`).
set -uo pipefail

HEALTH_URL="${RELEASE_PREFLIGHT_HEALTH_URL:-https://bimmetraj.com/api/health}"
MAIN_REF="origin/main"
# Untracked/modified paths that are expected in local worktrees and never block a release.
IGNORED_DIRTY_PATHS=(
  ':(exclude)graphify-out/*'
  ':(exclude)proje_analiz_gap_bug_seo_geo_rakip_raporu.md'
  ':(exclude)docs/agent-memory/gelecekteki-global-konumlandırma.md'
)

ALLOW_PENDING=0
for arg in "$@"; do
  case "$arg" in
    --allow-pending) ALLOW_PENDING=1 ;;
    -h|--help) sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)" || exit 2
cd "$REPO_ROOT" || exit 2

for tool in git curl jq gh; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Missing required tool: $tool" >&2; exit 2; }
done

FAILED_CHECKS=""
FAILED_COUNT=0
fail() {
  FAILED_CHECKS="$FAILED_CHECKS  - $1"$'\n'
  FAILED_COUNT=$((FAILED_COUNT + 1))
}
section() { printf '\n== %s ==\n' "$1"; }

section "1. Fetch"
if git fetch --prune origin; then
  echo "Fetched origin (pruned)."
else
  echo "git fetch failed; results below may be stale." >&2
  fail "fetch"
fi
MAIN_SHA="$(git rev-parse --verify --quiet "$MAIN_REF")" || { echo "$MAIN_REF not found." >&2; exit 2; }
echo "$MAIN_REF = $MAIN_SHA ($(git log -1 --format=%s "$MAIN_SHA"))"

section "2. Local branches with commits not on $MAIN_REF"
branch_findings=0
while IFS='|' read -r branch upstream track; do
  ahead="$(git rev-list --count "$MAIN_REF..refs/heads/$branch")"
  [ "$ahead" -eq 0 ] && continue
  tip="$(git log -1 --format='%h %s' "refs/heads/$branch")"
  if [ -z "$upstream" ]; then
    flag="NO UPSTREAM (never pushed)"
  elif [ "$track" = "[gone]" ]; then
    flag="UPSTREAM GONE ($upstream deleted on remote)"
  elif [ -n "$track" ]; then
    flag="$upstream $track"
  else
    flag="pushed to $upstream"
  fi
  printf '  %-45s +%-3s %s\n      tip: %s\n' "$branch" "$ahead" "$flag" "$tip"
  branch_findings=$((branch_findings + 1))
done < <(git for-each-ref --format='%(refname:short)|%(upstream:short)|%(upstream:track)' refs/heads)
if [ "$branch_findings" -eq 0 ]; then
  echo "  none"
else
  fail "branches ($branch_findings not on main)"
fi

section "3. Worktrees with uncommitted changes"
dirty_findings=0
while IFS= read -r line; do
  case "$line" in
    "worktree "*) wt_path="${line#worktree }" ;;
    "")
      [ -n "${wt_path:-}" ] || continue
      if [ -d "$wt_path" ]; then
        changes="$(git -C "$wt_path" -c core.quotePath=false status --porcelain -- . "${IGNORED_DIRTY_PATHS[@]}")"
        if [ -n "$changes" ]; then
          wt_branch="$(git -C "$wt_path" branch --show-current)"
          printf '  %s [%s] %s changed path(s)\n' "$wt_path" "${wt_branch:-detached}" "$(printf '%s\n' "$changes" | wc -l | tr -d ' ')"
          printf '%s\n' "$changes" | head -10 | sed 's/^/      /'
          dirty_findings=$((dirty_findings + 1))
        fi
      fi
      wt_path=""
      ;;
  esac
done < <(git worktree list --porcelain; echo)
if [ "$dirty_findings" -eq 0 ]; then
  echo "  none"
else
  fail "worktrees ($dirty_findings dirty)"
fi

section "4. Open pull requests"
if prs="$(gh pr list --state open --json number,title,headRefName,isDraft \
  -q '.[] | "  #\(.number) \(.headRefName)\(if .isDraft then " (draft)" else "" end): \(.title)"')"; then
  if [ -z "$prs" ]; then
    echo "  none"
  else
    printf '%s\n' "$prs"
    fail "open PRs ($(printf '%s\n' "$prs" | wc -l | tr -d ' '))"
  fi
else
  echo "  gh pr list failed (run 'gh auth login')." >&2
  fail "open PRs (could not list)"
fi

section "5. CI for $MAIN_REF"
if ! "$SCRIPT_DIR/require-green-ci.sh" "$MAIN_SHA"; then
  fail "CI not green for main"
fi

section "6. Live revision ($HEALTH_URL)"
live_rev="$(curl -fsS --max-time 15 "$HEALTH_URL" | jq -r '.revision // empty' 2>/dev/null || true)"
if [ -z "$live_rev" ]; then
  echo "  Could not read .revision from $HEALTH_URL."
elif [ "$live_rev" = "$MAIN_SHA" ]; then
  echo "  live = $live_rev — live is 0 commits behind main (up to date)."
elif git cat-file -e "$live_rev^{commit}" 2>/dev/null; then
  behind="$(git rev-list --count "$live_rev..$MAIN_SHA")"
  ahead="$(git rev-list --count "$MAIN_SHA..$live_rev")"
  echo "  live = $live_rev ($(git log -1 --format=%s "$live_rev"))"
  echo "  live is $behind commits behind main"
  [ "$ahead" -gt 0 ] && echo "  WARNING: live has $ahead commit(s) that are not on main."
else
  echo "  live = $live_rev — not in the local repository; cannot count commits behind main."
fi

section "Summary"
if [ "$FAILED_COUNT" -eq 0 ]; then
  echo "PREFLIGHT OK: nothing pending. Deploy $MAIN_SHA in Coolify, then confirm /api/health .revision."
  exit 0
fi
printf '%s' "$FAILED_CHECKS"
if [ "$ALLOW_PENDING" -eq 1 ]; then
  echo "PREFLIGHT WARN: $FAILED_COUNT check(s) found pending work (--allow-pending, exit 0)."
  exit 0
fi
echo "PREFLIGHT BLOCKED: $FAILED_COUNT check(s) found pending work. Resolve them or rerun with --allow-pending."
exit 1
