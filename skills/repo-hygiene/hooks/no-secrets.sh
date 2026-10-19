#!/usr/bin/env bash
# Blokkeert tokens en wachtwoorden in gecommitte bestanden.
set -uo pipefail
pattern='(gh[pousr]_[A-Za-z0-9]{20,}|sk-ant-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|password[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"'[:space:]]{6,}["'"'"'])'
# Alleen bestandsnamen: de match zelf mag niet in terminal- of CI-logs belanden.
if grep -lEi "$pattern" "$@"; then
  echo "Mogelijk geheim gevonden in bovenstaande bestanden, commit gestopt"
  exit 1
fi
exit 0
