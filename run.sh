#!/usr/bin/env bash
# One-command local synthetic demo. Run with Git Bash on Windows: bash run.sh
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

command -v node >/dev/null || { echo 'Install Node.js 22 first.' >&2; exit 1; }
command -v npm >/dev/null || { echo 'npm is required.' >&2; exit 1; }

if [[ ! -d node_modules ]]; then npm ci; fi
if [[ ! -f .env ]]; then
  node --input-type=module -e '
    import { readFileSync, writeFileSync } from "node:fs";
    import { randomBytes } from "node:crypto";
    const template = readFileSync(".env.example", "utf8");
    writeFileSync(".env", template
      .replace("replace-with-32+-random-chars", randomBytes(32).toString("hex"))
      .replace("AI_PROVIDER=none", "AI_PROVIDER=fixture"));
  '
  echo 'Created .env with a random session secret and labeled mock AI.'
fi

node --env-file=.env -e 'if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) { console.error("Set SESSION_SECRET to at least 32 characters in .env"); process.exit(1) }'

db_pid=''; worker_pid=''; web_pid=''
cleanup() {
  trap - EXIT INT TERM
  for pid in "$web_pid" "$worker_pid"; do
    if [[ -n "$pid" ]]; then kill "$pid" 2>/dev/null || true; fi
  done
  for pid in "$web_pid" "$worker_pid"; do
    if [[ -n "$pid" ]]; then wait "$pid" 2>/dev/null || true; fi
  done
  if [[ -n "$db_pid" ]]; then
    kill "$db_pid" 2>/dev/null || true
    wait "$db_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

echo 'Starting local PostgreSQL...'
node node_modules/tsx/dist/cli.mjs scripts/local-db.ts & db_pid=$!
ready=0
for attempt in {1..30}; do
  if node --env-file=.env --input-type=module -e '
    import pg from "pg";
    const c = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 1000 });
    try { await c.connect(); await c.end(); } catch { process.exit(1); }
  ' >/dev/null 2>&1; then ready=1; break; fi
  if ! kill -0 "$db_pid" 2>/dev/null; then echo 'Local database exited early.' >&2; exit 1; fi
  sleep 1
done
if [[ "$ready" != 1 ]]; then echo 'Local database did not become ready.' >&2; exit 1; fi

node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/migrate.ts
node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/seed.ts

echo 'Starting background worker...'
node --env-file=.env node_modules/tsx/dist/cli.mjs src/worker/main.ts & worker_pid=$!
echo 'Starting website at http://localhost:3000/signin'
node node_modules/next/dist/bin/next dev & web_pid=$!
wait "$web_pid"
