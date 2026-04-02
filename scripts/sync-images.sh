#!/usr/bin/env bash
set -euo pipefail

SERVER="root@185.189.50.41"
REMOTE_DIR="/var/www/kosttilskudsvalg/public"
LOCAL_DIR="public"

DIRS=("images/products" "vendor/products")

usage() {
  echo "Usage: $0 <pull|push>"
  echo ""
  echo "  pull   Download all image assets from production server to local"
  echo "  push   Upload local image assets to production server"
  echo ""
  echo "Syncs: ${DIRS[*]}"
  exit 1
}

[[ $# -lt 1 ]] && usage

case "$1" in
  pull)
    for dir in "${DIRS[@]}"; do
      echo "==> Pulling $dir from server..."
      mkdir -p "$LOCAL_DIR/$dir"
      rsync -avz --progress "$SERVER:$REMOTE_DIR/$dir/" "$LOCAL_DIR/$dir/"
    done
    echo "Done. All images pulled to $LOCAL_DIR/"
    ;;
  push)
    for dir in "${DIRS[@]}"; do
      echo "==> Pushing $dir to server..."
      rsync -avz --progress "$LOCAL_DIR/$dir/" "$SERVER:$REMOTE_DIR/$dir/"
    done
    echo "Done. All images pushed to $REMOTE_DIR/"
    ;;
  *)
    usage
    ;;
esac
