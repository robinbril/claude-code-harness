#!/usr/bin/env bash
# Blokkeert tokens en wachtwoorden in gecommitte bestanden.
set -uo pipefail
pattern='(gh[pousr]_[A-Za-z0-9]{20,}|sk-ant-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|password[[:space:]]*=[[:space:]]*[^[:space:]]+)'
if grep -nEi "$pattern" "$@"; then
  echo "Mogelijk geheim gevonden, commit gestopt"
  exit 1
fi
exit 0
