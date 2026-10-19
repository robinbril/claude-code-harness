#!/usr/bin/env bash
# Eerste regel van het commitbericht: niet leeg, maximaal 72 tekens.
set -euo pipefail
first="$(head -1 "$1")"
if [ -z "$first" ] || [ "${#first}" -gt 72 ]; then
  echo "Eerste regel van het commitbericht is leeg of langer dan 72 tekens"
  exit 1
fi
