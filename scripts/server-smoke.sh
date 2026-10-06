#!/usr/bin/env bash
# Start the built self-hosted server (app/dist/server.mjs) with whichever node is on PATH, in token mode, on a free
# port of 127.0.0.1, with its data in a throwaway folder; pass when that server answers the sign-in link by setting
# archdraw's own cookie. CI's node-22 job and scripts/ci-local.sh run it to prove the lowest supported Node runs it.
set -euo pipefail
cd "$(dirname "$0")/../app"
tmp="$(mktemp -d)"
pid=""
trap '[ -z "$pid" ] || kill "$pid" 2>/dev/null || true; [ -z "$pid" ] || wait "$pid" 2>/dev/null || true; rm -rf "$tmp"' EXIT
port="$(node -e "const s=require('net').createServer().listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close()})")"
ARCHDRAW_HOME="$tmp/home" ARCHDRAW_SECRETS="$tmp/providers.env" ARCHDRAW_GATE=token ARCHDRAW_TOKEN=smoke ARCHDRAW_SYNC=0 \
  ARCHDRAW_PORT="$port" node dist/server.mjs >"$tmp/log" 2>&1 &
pid=$!
deadline=$((SECONDS + 30))
while [ "$SECONDS" -lt "$deadline" ]; do
  # each request gives up after 2 s, so a server that accepts and never answers fails here instead of hanging
  if curl -s -m 2 -o /dev/null -D "$tmp/headers" "http://127.0.0.1:$port/?token=smoke" &&
    grep -qi '^set-cookie: archdraw=' "$tmp/headers"; then
    echo "server smoke ok: node $(node -v), $(head -1 "$tmp/headers" | tr -d '\r')"
    exit 0
  fi
  if ! kill -0 "$pid" 2>/dev/null; then echo "the server exited:"; cat "$tmp/log"; exit 1; fi
  sleep 0.5
done
echo "the server did not answer with its sign-in cookie within 30 s:"; cat "$tmp/log"; exit 1
