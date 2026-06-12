#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-backend/.env}"
MIGRATION_FILE="${1:-db/migrations/001_baseline.sql}"

if [[ ! -f "$ENV_FILE" && -z "${DATABASE_URL:-}" ]]; then
  echo "Missing $ENV_FILE. Copy backend/.env.example and set DATABASE_URL." >&2
  exit 1
fi

if [[ -n "${DATABASE_URL:-}" ]]; then
  DATABASE_URL_VALUE="$DATABASE_URL"
elif ! grep -q '^DATABASE_URL=' "$ENV_FILE"; then
  echo "Missing DATABASE_URL in $ENV_FILE." >&2
  exit 1
else
  DATABASE_URL_VALUE="$(grep -m1 '^DATABASE_URL=' "$ENV_FILE" | cut -d '=' -f 2-)"
fi

DATABASE_URL_VALUE="${DATABASE_URL_VALUE%\"}"
DATABASE_URL_VALUE="${DATABASE_URL_VALUE#\"}"
DATABASE_URL_VALUE="${DATABASE_URL_VALUE%\'}"
DATABASE_URL_VALUE="${DATABASE_URL_VALUE#\'}"

if [[ -z "$DATABASE_URL_VALUE" ]]; then
  echo "DATABASE_URL is empty in $ENV_FILE." >&2
  exit 1
fi

if [[ ! -f "$MIGRATION_FILE" ]]; then
  echo "Migration file was not found: $MIGRATION_FILE" >&2
  exit 1
fi

DOCKER_BIN="${DOCKER_BIN:-docker}"

WINDOWS_DOCKER="/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"

if ! command -v "$DOCKER_BIN" >/dev/null 2>&1 || ! "$DOCKER_BIN" version >/dev/null 2>&1; then
  if [[ -x "$WINDOWS_DOCKER" ]] && "$WINDOWS_DOCKER" version >/dev/null 2>&1; then
    DOCKER_BIN="$WINDOWS_DOCKER"
  else
    echo "Docker was not found. Install Docker in WSL, enable Docker Desktop WSL integration, or set DOCKER_BIN." >&2
    exit 1
  fi
fi

"$DOCKER_BIN" run --rm \
  -i \
  -e "DATABASE_URL=$DATABASE_URL_VALUE" \
  postgres:16 \
  sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' < "$MIGRATION_FILE"
