#!/usr/bin/env bash
# Run CI's Linux job on this machine before pushing: the same steps as .github/workflows/ci.yml, in a fresh clone of
# the committed HEAD (no node_modules, no build output, nothing uncommitted), with the GitHub CLI signed out and no git
# identity, as on the runner. It works in ../.ci-local beside the repo (or CI_LOCAL_DIR) and keeps downloaded browsers
# and Electron in ../.cache. Usage: scripts/ci-local.sh [--keep]   (needs Node 24, bun, git, xvfb-run; fetches Node 22.19.0 through npx for the lowest-version step)
set -euo pipefail
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
work="$(realpath -m "${CI_LOCAL_DIR:-$repo/../.ci-local}")"
# the work folder is deleted and recreated: never the disk, the home folder, the repo, or a folder that holds a repo
case "$work" in "" | "/" | "$HOME" | "$repo" | "$repo"/*) echo "ci-local: refusing to use $work as the work folder" >&2; exit 2 ;; esac
if [ -e "$work" ] && [ ! -e "$work/.ci-local" ]; then echo "ci-local: $work exists and was not made by this script; refusing to delete it" >&2; exit 2; fi
rm -rf "$work" && mkdir -p "$work" && touch "$work/.ci-local"
git clone -q --no-hardlinks "$repo" "$work/src"
cd "$work/src"
echo "ci-local: $(git log -1 --format='%h %s')"

# the runner: no GitHub login, no git identity of its own, caches kept out of the home folder
export GH_CONFIG_DIR="$work/gh" && mkdir -p "$GH_CONFIG_DIR"
unset GH_TOKEN GITHUB_TOKEN GH_ENTERPRISE_TOKEN
export GIT_CONFIG_GLOBAL="$work/gitconfig" && : > "$GIT_CONFIG_GLOBAL"
export GIT_CONFIG_NOSYSTEM=1
unset GIT_AUTHOR_NAME GIT_AUTHOR_EMAIL GIT_COMMITTER_NAME GIT_COMMITTER_EMAIL
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$repo/../.cache/playwright}"
export ELECTRON_CACHE="${ELECTRON_CACHE:-$repo/../.cache/electron}"
export ELECTRON_BUILDER_CACHE="${ELECTRON_BUILDER_CACHE:-$repo/../.cache/electron-builder}"
export E2E_OUT="$work/e2e" && mkdir -p "$E2E_OUT"

step() { echo; echo "── $1"; }
step engine
(cd engine && npm ci --no-audit --no-fund)
(cd engine && npm run build)
step "app dependencies"
(cd app && npm ci --no-audit --no-fund)
(cd app/ui && bun install --frozen-lockfile)
cd app
# one command per line: under set -e a failure early in an `a && b` list would not stop the script
step type-check
npx tsc -p tsconfig.json --noEmit
(cd ui && npx tsc -b)
step "unit tests"
npx vitest run
(cd ui && npx vitest run)
step build;               npm run build:all
step "browser end-to-end"
npx playwright-core install chromium >/dev/null
npx tsx e2e/app.e2e.ts
npx tsx e2e/tour.e2e.ts
step "package (Linux)";   npx electron-builder --linux --publish never
step "launch check";      ARCHDRAW_SMOKE=1 ARCHDRAW_NO_UPDATE=1 timeout 120 xvfb-run -a release/linux-unpacked/archdraw --no-sandbox --user-data-dir="$work/smoke"
step "desktop end-to-end"
node node_modules/electron/install.js
xvfb-run -a npx tsx e2e/desktop.e2e.ts
step "Node 22.19.0, the lowest supported: type-check, unit tests, the server starts (CI's node-22 job)"
npx -y -p node@22.19.0 -c 'set -e; node -v; npx tsc -p tsconfig.json --noEmit; (cd ui && npx tsc -b); npx vitest run; (cd ui && npx vitest run); ../scripts/server-smoke.sh'
echo; echo "ci-local: all steps passed"
[ "${1:-}" = "--keep" ] || rm -rf "$work"
