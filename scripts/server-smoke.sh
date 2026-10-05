#!/usr/bin/env bash
# Start the built self-hosted server (app/dist/server.mjs) with whichever node is on PATH, in token mode, on a free
# port of 127.0.0.1, with its data in a throwaway folder; pass when it answers the sign-in link. CI's Node 22 job and
# scripts/ci-local.sh run it to prove the lowest Node archdraw supports can run the server.
set -euo pipefail
cd "$(dirname "$0")/../app"
tmp="$(mktemp -d)"
port="$(node -e "const s=require('net').createServer().listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close()})")"
ARCHDRAW_HOME="$tmp/home" ARCHDRAW_SECRETS="$tmp/providers.env" ARCHDRAW_GATE=token ARCHDRAW_TOKEN=smoke ARCHDRAW_SYNC=0 \
  ARCHDRAW_PORT="$port" node dist/server.mjs >"$tmp/log" 2>&1 &
pid=$!
trap 'kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; rm -rf "$tmp"' EXIT
for _ in $(seq 1 60); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/?token=smoke" || true)"
  case "$code" in
    2??|3??) echo "server smoke ok: node $(node -v), HTTP $code"; exit 0 ;;
  esac
  if ! kill -0 "$pid" 2>/dev/null; then echo "the server exited:"; cat "$tmp/log"; exit 1; fi
  sleep 0.5
done
echo "the server did not answer within 30 s:"; cat "$tmp/log"; exit 1
