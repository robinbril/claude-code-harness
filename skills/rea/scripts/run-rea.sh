#!/bin/sh
set -eu
if command -v rea >/dev/null 2>&1; then
  exec rea "$@"
fi
if ! command -v node >/dev/null 2>&1 || ! command -v npx >/dev/null 2>&1; then
  printf '%s\n' 'REA needs an existing supported Node.js and npm installation.' >&2
  exit 127
fi
exec npx --yes "rea-agents@${REA_VERSION:-6.4.0}" "$@"
