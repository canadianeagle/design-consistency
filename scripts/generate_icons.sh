#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/assets/icons/logo.svg"
OUT_DIR="$ROOT/assets/icons"

if [[ ! -f "$SRC" ]]; then
  echo "Source SVG not found: $SRC" >&2
  exit 1
fi

for size in 16 32 48 64 128 256 512; do
  sips -s format png -z "$size" "$size" "$SRC" --out "$OUT_DIR/icon-${size}.png" >/dev/null
  echo "generated $OUT_DIR/icon-${size}.png"
done
