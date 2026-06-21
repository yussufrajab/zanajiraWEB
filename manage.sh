#!/usr/bin/env bash
# manage.sh — start/stop/restart/status for CSC Zanzibar native services + apps.
# No Docker. Backing services are pre-installed on the host.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Load .env if present (do not fail if missing — only apps need it)
if [[ -f .env ]]; then set -a; . ./.env; set +a; fi

PID_DIR="${ROOT_DIR}/.run"
mkdir -p "$PID_DIR"
LOG_DIR="${ROOT_DIR}/.run/logs"
mkdir -p "$LOG_DIR"

API_PORT="${API_PORT:-4000}"
WEB_PORT="${WEB_PORT:-3000}"
MINIO_DATA="${MINIO_DATA:-${ROOT_DIR}/.run/minio-data}"
MINIO_PORT="${MINIO_PORT:-9000}"
MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-9001}"

# ---------- helpers ----------
c_red() { printf '\033[31m%s\033[0m' "$1"; }
c_grn() { printf '\033[32m%s\033[0m' "$1"; }
c_ylw() { printf '\033[33m%s\033[0m' "$1"; }

pid_alive() { local p; p="${1:-}"; [[ -n "$p" ]] && kill -0 "$p" 2>/dev/null; }

start_bg() { # <name> <pidfile> <logfile> <command...>
  local name="$1" pidfile="$2" logfile="$3"; shift 3
  if pid_alive "$(cat "$pidfile" 2>/dev/null || true)"; then
    echo "$(c_ylw "$name already running")"; return 0
  fi
  echo "Starting $name ..."
  nohup "$@" >>"$logfile" 2>&1 &
  echo $! > "$pidfile"
  sleep 0.3
  if pid_alive "$(cat "$pidfile")"; then echo "$(c_grn "$name started (pid $(cat "$pidfile"))")";
  else echo "$(c_red "$name failed to start — see $logfile")"; return 1; fi
}

stop_bg() { # <name> <pidfile>
  local name="$1" pidfile="$2" p
  p="$(cat "$pidfile" 2>/dev/null || true)"
  if pid_alive "$p"; then
    kill "$p" 2>/dev/null || true
    for _ in {1..10}; do pid_alive "$p" || break; sleep 0.3; done
    pid_alive "$p" && kill -9 "$p" 2>/dev/null || true
    echo "$(c_grn "$name stopped")"
  else
    echo "$(c_ylw "$name not running")"
  fi
  rm -f "$pidfile"
}

# ---------- native backing services (pre-installed) ----------
svc_start() { # <name> <start-cmd...>
  local name="$1"; shift
  if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q "^$name\.service"; then
    sudo -n systemctl start "$name" 2>/dev/null || systemctl start "$name" 2>/dev/null || "$@"
  else
    "$@"
  fi
}
svc_stop() { # <name> <stop-cmd...>
  local name="$1"; shift
  if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q "^$name\.service"; then
    sudo -n systemctl stop "$name" 2>/dev/null || systemctl stop "$name" 2>/dev/null || "$@"
  else
    "$@"
  fi
}
svc_status() { # <name>
  if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q "^$1\.service"; then
    systemctl is-active "$1" 2>/dev/null || echo "inactive"
  else echo "unknown (no systemd unit)"; fi
}

postgres_start() {
  svc_start postgresql pg_ctlcluster 16 main start 2>/dev/null || \
    (command -v pg_ctlcluster >/dev/null && pg_ctlcluster 16 main start) || \
    (command -v service >/dev/null && service postgresql start)
}
postgres_stop()  {
  svc_stop postgresql pg_ctlcluster 16 main stop 2>/dev/null || \
    (command -v pg_ctlcluster >/dev/null && pg_ctlcluster 16 main stop) || \
    (command -v service >/dev/null && service postgresql stop)
}
redis_start()   { svc_start redis-server redis-server --daemonize yes; }
redis_stop()    { svc_stop redis-server redis-cli shutdown nosave 2>/dev/null || true; }
clamav_start()  { svc_start clamav-daemon clamd --config-file="$ROOT_DIR/infra/clamav/clamav.conf" 2>/dev/null || true; }
clamav_stop()   { svc_stop clamav-daemon pkill -TERM -x clamd 2>/dev/null || true; }

minio_start() {
  mkdir -p "$MINIO_DATA"
  start_bg minio "$PID_DIR/minio.pid" "$LOG_DIR/minio.log" \
    minio server "$MINIO_DATA" --address ":${MINIO_PORT}" --console-address ":${MINIO_CONSOLE_PORT}"
}
minio_stop()  { stop_bg minio "$PID_DIR/minio.pid"; }

# ensure the documents bucket exists once minio is up
minio_ensure_bucket() {
  command -v mc >/dev/null 2>&1 || return 0
  mc alias set local "http://127.0.0.1:${MINIO_PORT}" "${S3_ACCESS_KEY:-minioadmin}" "${S3_SECRET_KEY:-minioadmin}" >/dev/null 2>&1 || true
  mc mb "local/${S3_BUCKET:-zanweb-documents}" --ignore-existing >/dev/null 2>&1 || true
}

# ---------- apps ----------
api_start() {
  start_bg api "$PID_DIR/api.pid" "$LOG_DIR/api.log" \
    node "$ROOT_DIR/apps/api/dist/main.js"
}
api_stop()  { stop_bg api "$PID_DIR/api.pid"; }
web_start() {
  start_bg web "$PID_DIR/web.pid" "$LOG_DIR/web.log" \
    node "$ROOT_DIR/apps/web/server.js"
}
web_stop()  { stop_bg web "$PID_DIR/web.pid"; }

# ---------- commands ----------
SERVICES=(postgres redis minio clamav)
APPS=(api web)

cmd_start() {
  postgres_start; redis_start; minio_start; clamav_start
  minio_ensure_bucket
}
cmd_stop()  { web_stop; api_stop; clamav_stop; minio_stop; redis_stop; postgres_stop; }
cmd_restart(){ cmd_stop; sleep 1; cmd_start; }
cmd_start_apps(){ api_start; web_start; }
cmd_stop_apps(){ web_stop; api_stop; }

cmd_status() {
  for s in "${SERVICES[@]}"; do printf '%-10s %s\n' "$s" "$(svc_status "$s")"; done
  for a in "${APPS[@]}"; do
    local p; p="$(cat "$PID_DIR/$a.pid" 2>/dev/null || true)"
    if pid_alive "$p"; then printf '%-10s %s\n' "$a" "running (pid $p)"; else printf '%-10s %s\n' "$a" "stopped"; fi
  done
}

usage() {
  cat <<EOF
Usage: ./manage.sh <command>
Commands:
  start          start backing services (postgres, redis, minio, clamav) + ensure bucket
  stop           stop everything (apps first, then services)
  restart        stop then start
  start-apps     start api + web (after deps are up and built)
  stop-apps      stop api + web
  status         show status of services + apps
EOF
}

case "${1:-}" in
  start) cmd_start ;;
  stop) cmd_stop ;;
  restart) cmd_restart ;;
  start-apps) cmd_start_apps ;;
  stop-apps) cmd_stop_apps ;;
  status) cmd_status ;;
  *) usage; exit 1 ;;
esac