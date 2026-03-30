#!/bin/bash
# =============================================================================
# DEPLOY SCRIPT - Kosttilskudsvalg
# =============================================================================
# Stoppar PM2 kort under install+build for att undvika npm-korruption.
# Sajten ar offline i ~2-3 minuter under bygget.
# Om bygget misslyckas startas gamla versionen om direkt.
# =============================================================================

set -u

APP_NAME="kosttilskudsvalg"
APP_PORT=3001

GIT_BIN=""
STATE_DIR=".deploy-cache"
LAST_DEPLOYED_COMMIT_FILE="$STATE_DIR/last_deployed_commit"
LOCK_HASH_FILE="$STATE_DIR/package_lock_sha256"

resolve_git() {
  if command -v git >/dev/null 2>&1; then
    GIT_BIN="$(command -v git)"
    return 0
  fi
  if [ -x "/usr/lib/git-core/git" ]; then
    GIT_BIN="/usr/lib/git-core/git"
    return 0
  fi
  return 1
}

require_cmd() {
  local cmd="$1"
  if [ "$cmd" = "git" ]; then
    if resolve_git; then return 0; fi
  fi
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "❌ Missing required command: $cmd"
    exit 1
  fi
}

assert_ok() {
  if [ "$1" -ne 0 ]; then
    echo "❌ $2"
    echo "   Avbryter deploy innan PM2 påverkas."
    exit 1
  fi
}

echo "========================================"
echo "🚀 Deploying $APP_NAME..."
echo "========================================"

echo "🔎 Preflight checks..."
require_cmd git
require_cmd npm
require_cmd pm2
echo "   git: ${GIT_BIN:-$(command -v git)}"
if [ ! -d ".git" ]; then
  echo "❌ Ingen .git-katalog hittad i $(pwd)"
  exit 1
fi

# Phase 1: pull + re-exec
if [ "${1:-}" != "--phase2" ]; then
  echo ""
  echo "📥 Phase 1: Pulling latest code..."
  "${GIT_BIN:-git}" fetch origin
  assert_ok $? "git fetch origin misslyckades"
  "${GIT_BIN:-git}" reset --hard origin/main
  assert_ok $? "git reset --hard origin/main misslyckades"
  echo "🔄 Re-executing updated deploy script..."
  exec bash scripts/deploy.sh --phase2
fi

# No-op check
mkdir -p "$STATE_DIR"
CURRENT_COMMIT="$("${GIT_BIN:-git}" rev-parse HEAD 2>/dev/null || true)"
if [ "${FORCE_DEPLOY:-false}" != "true" ] && [ -n "$CURRENT_COMMIT" ] && [ -f "$LAST_DEPLOYED_COMMIT_FILE" ]; then
  LAST_DEPLOYED_COMMIT="$(cat "$LAST_DEPLOYED_COMMIT_FILE" 2>/dev/null || true)"
  if [ -n "$LAST_DEPLOYED_COMMIT" ] && [ "$CURRENT_COMMIT" = "$LAST_DEPLOYED_COMMIT" ]; then
    echo ""
    echo "⚡ No-op deploy: commit $CURRENT_COMMIT ar redan deployad."
    PORT=$APP_PORT pm2 restart "$APP_NAME" --update-env 2>/dev/null || true
    exit 0
  fi
fi

# Save untracked generated files before git clean
echo ""
echo "💾 Saving untracked generated files..."
BACKUP_DIR=$(mktemp -d)
if [ -d "public/generated" ]; then
  cp -r public/generated "$BACKUP_DIR/generated" 2>/dev/null || true
fi
if [ -d "public/images" ]; then
  cp -r public/images "$BACKUP_DIR/images" 2>/dev/null || true
fi
echo "  Backup saved to $BACKUP_DIR"

# Clean untracked files
echo "🧹 Cleaning untracked files..."
"${GIT_BIN:-git}" clean -fd \
  --exclude=.env.local \
  --exclude=node_modules \
  --exclude=.deploy-cache \
  --exclude='public/**' \
  --exclude=deploy.log

# Restore generated files
echo "📂 Restoring generated files..."
if [ -d "$BACKUP_DIR/generated" ]; then
  mkdir -p public/generated
  cp -rn "$BACKUP_DIR/generated/"* public/generated/ 2>/dev/null || true
fi
if [ -d "$BACKUP_DIR/images" ]; then
  mkdir -p public/images
  cp -rn "$BACKUP_DIR/images/"* public/images/ 2>/dev/null || true
fi
rm -rf "$BACKUP_DIR"

# Stop PM2 before npm install
echo ""
echo "⏸️  Stopping PM2..."
pm2 stop "$APP_NAME" 2>/dev/null || true

# Smart dependency install
CURRENT_LOCK_HASH="$(sha256sum package-lock.json 2>/dev/null | awk '{print $1}')"
PREV_LOCK_HASH=""
if [ -f "$LOCK_HASH_FILE" ]; then
  PREV_LOCK_HASH="$(cat "$LOCK_HASH_FILE" 2>/dev/null || true)"
fi
NEED_INSTALL=true
if [ -d "node_modules" ] && [ -n "$CURRENT_LOCK_HASH" ] && [ "$CURRENT_LOCK_HASH" = "$PREV_LOCK_HASH" ]; then
  NEED_INSTALL=false
fi

if [ "$NEED_INSTALL" = "true" ]; then
  echo ""
  echo "💾 Backing up node_modules..."
  if [ -d "node_modules" ]; then
    mv node_modules node_modules_backup
  fi

  echo ""
  echo "📦 Clean installing dependencies..."
  NODE_ENV=development npm ci --include=dev --no-audit --fund=false 2>&1
  INSTALL_OK=$?

  if [ $INSTALL_OK -ne 0 ]; then
    echo "⚠️  npm ci failed, trying npm install..."
    NODE_ENV=development npm install --include=dev --no-audit --fund=false 2>&1
    INSTALL_OK=$?
  fi

  if [ $INSTALL_OK -ne 0 ]; then
    echo "❌ npm install FAILED — restoring old node_modules..."
    rm -rf node_modules 2>/dev/null
    if [ -d "node_modules_backup" ]; then
      mv node_modules_backup node_modules
    fi
    echo "🔄 Restarting PM2 with previous version..."
    PORT=$APP_PORT pm2 restart "$APP_NAME" --update-env 2>/dev/null \
      || PORT=$APP_PORT pm2 start npm --name "$APP_NAME" -- start
    exit 1
  fi

  rm -rf node_modules_backup

  echo ""
  echo "🔧 Verifying sharp..."
  if node -e "require('sharp')" >/dev/null 2>&1; then
    echo "   sharp OK"
  else
    echo "   sharp saknas, reparerar..."
    npm rebuild sharp --no-audit --fund=false >/dev/null 2>&1 \
      || npm install sharp@0.32.6 --no-save --ignore-scripts --no-audit --fund=false >/dev/null 2>&1 \
      || true
  fi
else
  echo ""
  echo "⚡ package-lock oforandrad — hoppar over npm install."
fi

# Build
echo ""
echo "🔨 Building application..."
if NODE_ENV=production npm run build; then
  echo ""
  echo "🔄 Starting PM2..."
  PORT=$APP_PORT pm2 restart "$APP_NAME" --update-env 2>/dev/null \
    || PORT=$APP_PORT pm2 start npm --name "$APP_NAME" -- start

  echo ""
  echo "========================================"
  echo "✅ Deploy complete!"
  echo "========================================"
  if [ -n "$CURRENT_COMMIT" ]; then
    echo "$CURRENT_COMMIT" > "$LAST_DEPLOYED_COMMIT_FILE"
  fi
  if [ -n "$CURRENT_LOCK_HASH" ]; then
    echo "$CURRENT_LOCK_HASH" > "$LOCK_HASH_FILE"
  fi
else
  echo ""
  echo "❌ Build FAILED — restarting PM2 with previous version..."
  PORT=$APP_PORT pm2 restart "$APP_NAME" --update-env 2>/dev/null \
    || PORT=$APP_PORT pm2 start npm --name "$APP_NAME" -- start
  echo "========================================"
  echo "❌ Build FAILED — sajten kor med forra versionen"
  echo "========================================"
  exit 1
fi

echo ""
echo "Check status: pm2 status"
echo "View logs:    pm2 logs $APP_NAME"
