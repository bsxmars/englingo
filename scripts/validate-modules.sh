#!/bin/sh
# Validates only the given modules (copied, with all books and audio), so a half-written
# module elsewhere in content/ does not block you:
#   scripts/validate-modules.sh 02-future 03-modals
set -e
root=$(cd "$(dirname "$0")/.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir "$tmp/cards"
for b in "$root"/content/book*.yaml; do ln -s "$b" "$tmp/"; done
ln -s "$root/content/audio" "$tmp/audio"
for m in "$@"; do
  cp -R "$root/content/$m" "$tmp/$m"
  [ -f "$root/content/cards/$m.yaml" ] && ln -s "$root/content/cards/$m.yaml" "$tmp/cards/"
done
cd "$root" && node build/validate.ts "$tmp"
