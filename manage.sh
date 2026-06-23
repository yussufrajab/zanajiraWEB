#!/usr/bin/env bash
# manage.sh — start/stop/restart/status for CSC Zanzibar Web (zanweb).
# No Docker. Backing services are pre-installed on the host.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Load .env if present (non-fatal if missing — only apps need it)
if [[ -f .env ]]; then set -a; . ./.env; set +a; fi

# =============================================================================
# MODE: dev or prod
# =============================================================================
MODE="${ZANWEB_MODE:-dev}"

parse_mode_flags() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --dev)  MODE=dev; shift ;;
            --prod) MODE=prod; shift ;;
            *) shift ;;
        esac
    done
}

is_dev()  { [[ "$MODE" == "dev" ]]; }
is_prod() { [[ "$MODE" == "prod" ]]; }
mode_label() { if is_dev; then echo "DEV"; else echo "PROD"; fi; }

# =============================================================================
# PATHS & PORTS
# =============================================================================
PID_DIR="${ROOT_DIR}/.run"
LOG_DIR="${ROOT_DIR}/.run/logs"
mkdir -p "$PID_DIR" "$LOG_DIR"

API_PORT="${API_PORT:-4000}"
WEB_PORT="${WEB_PORT:-3000}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
REDIS_PORT="${REDIS_PORT:-6379}"
MINIO_PORT="${MINIO_PORT:-9000}"
MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-9001}"

MINIO_DATA="${MINIO_DATA:-${ROOT_DIR}/.run/minio-data}"
MINIO_ACCESS_KEY="${S3_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${S3_SECRET_KEY:-minioadmin}"
S3_BUCKET="${S3_BUCKET:-zanweb-documents}"

# Derived from .env if available
DB_NAME="${DB_NAME:-zanweb}"

API_PIDFILE="$PID_DIR/api.pid"
WEB_PIDFILE="$PID_DIR/web.pid"
MINIO_PIDFILE="$PID_DIR/minio.pid"

API_LOG="$LOG_DIR/api.log"
WEB_LOG="$LOG_DIR/web.log"
MINIO_LOG="$LOG_DIR/minio.log"

# Build artifact paths
API_PROD_ENTRY="$ROOT_DIR/apps/api/dist/apps/api/src/main.js"
WEB_PROD_ENTRY="$ROOT_DIR/apps/web/.next/standalone/apps/web/server.js"

# =============================================================================
# DEPENDENCY CHECKS
# =============================================================================
require_cmd() {
    local cmd="$1"
    local url="${2:-}"
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "ERROR: '$cmd' is required but not found in PATH."
        [[ -n "$url" ]] && echo "       Install from: $url"
        exit 1
    fi
}

require_cmd pnpm "https://pnpm.io/installation"
require_cmd node "https://nodejs.org/"

# =============================================================================
# COLORS
# =============================================================================
c_red()   { printf '\033[31m%s\033[0m' "$1"; }
c_grn()   { printf '\033[32m%s\033[0m' "$1"; }
c_ylw()   { printf '\033[33m%s\033[0m' "$1"; }
c_blu()   { printf '\033[34m%s\033[0m' "$1"; }
c_bold()  { printf '\033[1m%s\033[0m' "$1"; }

# =============================================================================
# PROCESS & PORT HELPERS
# =============================================================================
pid_alive() { local p; p="${1:-}"; [[ -n "$p" ]] && kill -0 "$p" >/dev/null 2>&1; }

start_bg() { # <name> <pidfile> <logfile> <command...>
    local name="$1" pidfile="$2" logfile="$3"; shift 3
    if pid_alive "$(cat "$pidfile" 2>/dev/null || true)"; then
        echo "$(c_ylw "$name already running")"
        return 0
    fi
    echo "Starting $name [$(mode_label)] ..."
    nohup "$@" >>"$logfile" 2>&1 </dev/null &
    echo $! > "$pidfile"
    sleep 0.5
    if pid_alive "$(cat "$pidfile" 2>/dev/null || true)"; then
        echo "$(c_grn "$name started (pid $(cat "$pidfile" 2>/dev/null || true))")"
    else
        echo "$(c_red "$name failed to start — see $logfile")"
        return 1
    fi
}

stop_bg() { # <name> <pidfile> [pattern-pkill]
    local name="$1" pidfile="$2" pattern="${3:-}"
    local p
    p="$(cat "$pidfile" 2>/dev/null || true)"
    if pid_alive "$p"; then
        kill "$p" >/dev/null 2>&1 || true
        for _ in {1..15}; do pid_alive "$p" || break; sleep 0.3; done
        pid_alive "$p" && kill -9 "$p" >/dev/null 2>&1 || true
        echo "$(c_grn "$name stopped")"
    else
        echo "$(c_ylw "$name not running (pidfile)")"
    fi
    rm -f "$pidfile"
    if [[ -n "$pattern" ]]; then
        pkill -f "$pattern" >/dev/null 2>&1 || true
    fi
}

port_is_open() {
    local port="$1"
    (command -v lsof >/dev/null 2>&1 && lsof -Pi :"$port" -sTCP:LISTEN -t >/dev/null 2>&1) || \
    (command -v ss >/dev/null 2>&1 && ss -tlnp 2>/dev/null | grep -qE ":${port}[[:space:]]")
}

port_pid() {
    local pid
    pid="$(lsof -ti:"$1" 2>/dev/null | head -1 || true)"
    if [[ -z "$pid" ]] && command -v ss >/dev/null 2>&1; then
        pid="$(ss -tlnp "( sport = :$1 )" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1 || true)"
    fi
    echo "$pid"
}

kill_port() {
    local port="$1" label="${2:-port $port}"
    if ! port_is_open "$port"; then
        return 0
    fi
    echo "$(c_ylw "Freeing $label on port $port ...")"
    local pid
    pid="$(port_pid "$port")"
    if [[ -n "$pid" ]]; then
        kill -9 "$pid" >/dev/null 2>&1 || sudo kill -9 "$pid" >/dev/null 2>&1 || true
        sleep 0.5
    fi
    if port_is_open "$port"; then
        fuser -k "${port}/tcp" >/dev/null 2>&1 || sudo fuser -k "${port}/tcp" >/dev/null 2>&1 || true
        sleep 0.5
    fi
    if port_is_open "$port"; then
        echo "$(c_red "Could not free $label on port $port")"
        return 1
    fi
    echo "$(c_grn "$label port $port freed")"
}

ensure_port_free() {
    local port="$1" label="${2:-service}"
    if port_is_open "$port"; then
        echo "$(c_ylw "$label is already running on port $port")"
        kill_port "$port" "$label"
    fi
}

wait_for_port() {
    local port="$1" label="$2" timeout="${3:-30}"
    local elapsed=0
    echo "Waiting for $label on port $port ..."
    while [[ $elapsed -lt $timeout ]]; do
        if port_is_open "$port"; then
            echo "$(c_grn "$label ready on port $port")"
            return 0
        fi
        sleep 1
        elapsed=$((elapsed + 1))
    done
    echo "$(c_red "$label failed to start within ${timeout}s")"
    return 1
}

http_responds() {
    local port="$1" path="${2:-/}"
    local code
    code="$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 --connect-timeout 2 "http://localhost:${port}${path}" 2>/dev/null || true)"
    [[ "$code" != "000" && -n "$code" ]]
}

# =============================================================================
# NATIVE BACKING SERVICES
# =============================================================================
svc_start() { # <name> <fallback-cmd...>
    local name="$1"; shift
    if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q "^${name}.service"; then
        sudo -n systemctl start "$name" >/dev/null 2>&1 || systemctl start "$name" >/dev/null 2>&1 || "$@"
    else
        "$@"
    fi
}

svc_stop() { # <name> <fallback-cmd...>
    local name="$1"; shift
    if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q "^${name}.service"; then
        sudo -n systemctl stop "$name" >/dev/null 2>&1 || systemctl stop "$name" >/dev/null 2>&1 || "$@"
    else
        "$@"
    fi
}

svc_status() { # <name>
    if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q "^${1}.service"; then
        systemctl is-active "$1" 2>/dev/null || echo "inactive"
    else
        echo "unknown (no systemd unit)"
    fi
}

# ---------- PostgreSQL ----------
is_postgres_running() {
    PGPASSWORD="${DB_PASS:-${DB_PASSWORD:-}}" psql -U "${DB_USER:-postgres}" -h localhost -p "$POSTGRES_PORT" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1 || \
    port_is_open "$POSTGRES_PORT"
}

postgres_start() {
    if is_postgres_running; then
        echo "$(c_grn "postgresql already running")"
        return 0
    fi
    echo "Starting postgresql ..."
    svc_start postgresql pg_ctlcluster 16 main start >/dev/null 2>&1 || \
        (command -v pg_ctlcluster >/dev/null 2>&1 && pg_ctlcluster 16 main start) || \
        (command -v service >/dev/null 2>&1 && service postgresql start) || true
    wait_for_port "$POSTGRES_PORT" "postgresql" 20 || true
    if is_postgres_running; then
        echo "$(c_grn "postgresql started")"
    else
        echo "$(c_red "postgresql failed to start")"
        return 1
    fi
}

postgres_stop() {
    if ! is_postgres_running; then
        echo "$(c_ylw "postgresql not running")"
        return 0
    fi
    echo "Stopping postgresql ..."
    svc_stop postgresql pg_ctlcluster 16 main stop -m fast >/dev/null 2>&1 || \
        (command -v pg_ctlcluster >/dev/null 2>&1 && pg_ctlcluster 16 main stop -m fast) || \
        (command -v service >/dev/null 2>&1 && service postgresql stop) || true
    for _ in {1..10}; do is_postgres_running || break; sleep 0.5; done
    if is_postgres_running; then
        local pid
        pid="$(port_pid "$POSTGRES_PORT" || true)"
        [[ -n "$pid" ]] && kill -9 "$pid" >/dev/null 2>&1 || true
    fi
    echo "$(c_grn "postgresql stopped")"
}

# ---------- Redis ----------
is_redis_running() { port_is_open "$REDIS_PORT"; }

redis_start() {
    if is_redis_running; then
        echo "$(c_grn "redis already running")"
        return 0
    fi
    echo "Starting redis ..."
    svc_start redis-server redis-server --daemonize yes >/dev/null 2>&1 || \
        redis-server --daemonize yes >/dev/null 2>&1 || true
    wait_for_port "$REDIS_PORT" "redis" 15 || true
    if is_redis_running; then
        echo "$(c_grn "redis started")"
    else
        echo "$(c_red "redis failed to start")"
        return 1
    fi
}

redis_stop() {
    if ! is_redis_running; then
        echo "$(c_ylw "redis not running")"
        return 0
    fi
    if command -v redis-cli >/dev/null 2>&1; then
        redis-cli shutdown nosave >/dev/null 2>&1 || true
    fi
    if is_redis_running; then
        local pid
        pid="$(port_pid "$REDIS_PORT" || true)"
        [[ -n "$pid" ]] && kill -9 "$pid" >/dev/null 2>&1 || true
    fi
    echo "$(c_grn "redis stopped")"
}

# ---------- MinIO ----------
is_minio_running() { port_is_open "$MINIO_PORT"; }

minio_start() {
    if is_minio_running; then
        echo "$(c_grn "minio already running")"
        return 0
    fi
    echo "Starting minio ..."
    mkdir -p "$MINIO_DATA"
    MINIO_ROOT_USER="$MINIO_ACCESS_KEY" MINIO_ROOT_PASSWORD="$MINIO_SECRET_KEY" \
        start_bg minio "$MINIO_PIDFILE" "$MINIO_LOG" \
            minio server "$MINIO_DATA" --address ":${MINIO_PORT}" --console-address ":${MINIO_CONSOLE_PORT}"
    wait_for_port "$MINIO_PORT" "minio" 20 || return 1
    minio_ensure_bucket
}

minio_stop() {
    stop_bg minio "$MINIO_PIDFILE"
    if is_minio_running; then
        kill_port "$MINIO_PORT" "minio"
    fi
}

minio_ensure_bucket() {
    command -v mc >/dev/null 2>&1 || return 0
    mc alias set local "http://127.0.0.1:${MINIO_PORT}" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null 2>&1 || true
    mc mb "local/${S3_BUCKET}" --ignore-existing >/dev/null 2>&1 || true
}

# ---------- ClamAV ----------
is_clamav_enabled() { [[ "${CLAMAV_ENABLED:-true}" != "false" ]]; }
clamav_binary_available() { command -v clamd >/dev/null 2>&1 || systemctl list-unit-files 2>/dev/null | grep -q "^clamav-daemon.service"; }

clamav_start() {
    if ! is_clamav_enabled; then
        echo "$(c_blu "clamav disabled by CLAMAV_ENABLED=false — skipping")"
        return 0
    fi
    if ! clamav_binary_available; then
        echo "$(c_ylw "clamav not installed — skipping")"
        return 0
    fi
    if systemctl is-active --quiet clamav-daemon 2>/dev/null; then
        echo "$(c_grn "clamav already running")"
        return 0
    fi
    echo "Starting clamav ..."
    svc_start clamav-daemon clamd --config-file="$ROOT_DIR/infra/clamav/clamav.conf" >/dev/null 2>&1 || true
    sleep 1
    if systemctl is-active --quiet clamav-daemon 2>/dev/null; then
        echo "$(c_grn "clamav started")"
    else
        echo "$(c_ylw "clamav start attempted but daemon may still be initializing")"
    fi
}

clamav_stop() {
    if ! clamav_binary_available; then
        return 0
    fi
    svc_stop clamav-daemon pkill -TERM -x clamd >/dev/null 2>&1 || true
    echo "$(c_grn "clamav stopped")"
}

# =============================================================================
# APPS
# =============================================================================
is_api_running() { port_is_open "$API_PORT"; }
is_web_running() { port_is_open "$WEB_PORT"; }

# Next.js standalone output in this pnpm workspace is nested under
# apps/web/.next/standalone/apps/web/ and does not copy .next/static
# or public automatically. Copy them so CSS, JS, images, and favicons
# are served in production.
web_prepare_standalone() {
    local standalone_dir="$ROOT_DIR/apps/web/.next/standalone/apps/web"
    if [[ ! -d "$standalone_dir" ]]; then
        return 0
    fi

    local copied=0

    if [[ -d "$ROOT_DIR/apps/web/.next/static" ]]; then
        mkdir -p "$standalone_dir/.next"
        cp -r "$ROOT_DIR/apps/web/.next/static" "$standalone_dir/.next/"
        copied=1
    fi

    if [[ -d "$ROOT_DIR/apps/web/public" ]]; then
        cp -r "$ROOT_DIR/apps/web/public" "$standalone_dir/"
        copied=1
    fi

    # Convenience symlink for systemd / deploy.sh
    if [[ -f "$standalone_dir/server.js" ]]; then
        ln -sf "$standalone_dir/server.js" "$ROOT_DIR/apps/web/server.js"
    fi

    if [[ "$copied" -eq 1 ]]; then
        echo "Prepared standalone static assets for production"
    fi
}

api_start() {
    ensure_port_free "$API_PORT" "api"
    if is_dev; then
        start_bg api "$API_PIDFILE" "$API_LOG" \
            pnpm dev:api
    else
        if [[ ! -f "$API_PROD_ENTRY" ]]; then
            echo "$(c_red "API not built — missing $API_PROD_ENTRY")"
            echo "Run: $(c_bold "./manage.sh build")  or  $(c_bold "pnpm --filter @zanweb/api build")"
            return 1
        fi
        start_bg api "$API_PIDFILE" "$API_LOG" \
            node "$API_PROD_ENTRY"
    fi
}

api_stop() {
    stop_bg api "$API_PIDFILE" "dist/apps/api/src/main.js"
    kill_port "$API_PORT" "api" || true
}

web_start() {
    ensure_port_free "$WEB_PORT" "web"
    if is_dev; then
        start_bg web "$WEB_PIDFILE" "$WEB_LOG" \
            pnpm dev:web
    else
        if [[ ! -f "$WEB_PROD_ENTRY" ]]; then
            echo "$(c_red "Web not built — missing $WEB_PROD_ENTRY")"
            echo "Run: $(c_bold "./manage.sh build")  or  $(c_bold "pnpm --filter @zanweb/web build")"
            return 1
        fi
        web_prepare_standalone
        start_bg web "$WEB_PIDFILE" "$WEB_LOG" \
            node "$WEB_PROD_ENTRY"
    fi
}

web_stop() {
    stop_bg web "$WEB_PIDFILE" "next dev|next-server"
    kill_port "$WEB_PORT" "web" || true
}

# =============================================================================
# COMMANDS
# =============================================================================
start_services() {
    echo ""
    echo -e "$(c_blu "══════════════════════════════════════════════")"
    echo -e "  $(c_bold "Starting backing services") [$(mode_label)]"
    echo -e "$(c_blu "══════════════════════════════════════════════")"
    echo ""
    postgres_start
    redis_start
    minio_start
    clamav_start
}

stop_services() {
    echo ""
    echo -e "$(c_blu "══════════════════════════════════════════════")"
    echo -e "  $(c_bold "Stopping backing services")"
    echo -e "$(c_blu "══════════════════════════════════════════════")"
    echo ""
    clamav_stop || true
    minio_stop || true
    redis_stop || true
    postgres_stop || true
}

start_apps() {
    echo ""
    echo -e "$(c_blu "══════════════════════════════════════════════")"
    echo -e "  $(c_bold "Starting apps") [$(mode_label)]"
    echo -e "$(c_blu "══════════════════════════════════════════════")"
    echo ""
    api_start
    web_start
}

stop_apps() {
    echo ""
    echo -e "$(c_blu "══════════════════════════════════════════════")"
    echo -e "  $(c_bold "Stopping apps")"
    echo -e "$(c_blu "══════════════════════════════════════════════")"
    echo ""
    api_stop || true
    web_stop || true
}

cmd_start() {
    parse_mode_flags "$@"
    start_services
}

cmd_stop() {
    stop_apps
    stop_services
}

cmd_restart() {
    stop_services
    sleep 1
    start_services
}

cmd_restart_all() {
    parse_mode_flags "$@"
    cmd_stop
    sleep 1
    start_services
    start_apps
}

cmd_start_apps() {
    parse_mode_flags "$@"
    start_apps
}

cmd_stop_apps() {
    stop_apps
}

cmd_restart_apps() {
    cmd_stop_apps
    sleep 1
    cmd_start_apps
}

cmd_dev() {
    parse_mode_flags "$@"
    MODE=dev
    cmd_start
    cmd_start_apps
}

cmd_prod() {
    parse_mode_flags "$@"
    MODE=prod
    cmd_build
    cmd_start
    cmd_start_apps
}

cmd_status() {
    echo ""
    echo -e "$(c_blu "══════════════════════════════════════════════")"
    echo -e "  $(c_bold "CSC Zanzibar Web status") [$(mode_label)]"
    echo -e "$(c_blu "══════════════════════════════════════════════")"
    echo ""
    echo -e "  $(c_bold "Backing services")"
    local pg_status; pg_status="$(svc_status postgresql)"
    if [[ "$pg_status" != "active" ]] && is_postgres_running; then pg_status="listening"; fi
    printf '    %-12s %-20s %s\n' "PostgreSQL" "$pg_status" "port $POSTGRES_PORT"
    local redis_status; redis_status="$(svc_status redis-server)"
    if [[ "$redis_status" != "active" ]] && is_redis_running; then redis_status="listening"; fi
    printf '    %-12s %-20s %s\n' "Redis"      "$redis_status" "port $REDIS_PORT"
    if is_minio_running; then
        printf '    %-12s %-20s %s\n' "MinIO"      "$(c_grn "listening")" "port $MINIO_PORT"
    else
        printf '    %-12s %-20s %s\n' "MinIO"      "$(c_red "stopped")" "port $MINIO_PORT"
    fi
    if is_clamav_enabled && clamav_binary_available; then
        local clam_status; clam_status="$(svc_status clamav-daemon)"
        printf '    %-12s %-20s %s\n' "ClamAV"     "$clam_status" "port ${CLAMAV_PORT:-3310}"
    fi
    echo ""
    echo -e "  $(c_bold "Applications")"
    if is_api_running; then
        local pid="$(port_pid "$API_PORT" || true)"
        printf '    %-12s %-20s %s\n' "API" "$(c_grn "running")" "port $API_PORT (pid ${pid:-?})"
    else
        printf '    %-12s %-20s %s\n' "API" "$(c_red "stopped")" "port $API_PORT"
    fi
    if is_web_running; then
        local pid="$(port_pid "$WEB_PORT" || true)"
        printf '    %-12s %-20s %s\n' "Web" "$(c_grn "running")" "port $WEB_PORT (pid ${pid:-?})"
    else
        printf '    %-12s %-20s %s\n' "Web" "$(c_red "stopped")" "port $WEB_PORT"
    fi
    echo ""
}

cmd_logs() {
    local service="${1:-all}"
    local lines="${2:-50}"
    case "$service" in
        api)
            echo "API logs (last $lines lines):"
            tail -n "$lines" "$API_LOG" 2>/dev/null || echo "$(c_red "No API log")" ;;
        web|frontend)
            echo "Web logs (last $lines lines):"
            tail -n "$lines" "$WEB_LOG" 2>/dev/null || echo "$(c_red "No web log")" ;;
        minio)
            echo "MinIO logs (last $lines lines):"
            tail -n "$lines" "$MINIO_LOG" 2>/dev/null || echo "$(c_red "No minio log")" ;;
        all|"")
            for label_file in "API:$API_LOG" "Web:$WEB_LOG" "MinIO:$MINIO_LOG"; do
                local label="${label_file%%:*}" file="${label_file##*:}"
                echo ""
                echo "=== $label (last 30 lines) ==="
                tail -n 30 "$file" 2>/dev/null || echo "$(c_red "No log at $file")"
            done ;;
        *)
            echo "$(c_red "Unknown log service: $service")"
            echo "Valid: api, web, minio, all"
            ;;
    esac
}

cmd_health() {
    echo ""
    echo -e "$(c_blu "══════════════════════════════════════════════")"
    echo -e "  $(c_bold "Health checks")"
    echo -e "$(c_blu "══════════════════════════════════════════════")"
    echo ""
    for svc in "PostgreSQL:$POSTGRES_PORT" "Redis:$REDIS_PORT" "MinIO:$MINIO_PORT" "API:$API_PORT" "Web:$WEB_PORT"; do
        local name="${svc%%:*}" port="${svc##*:}"
        if port_is_open "$port"; then
            printf '    %-12s %s\n' "$name" "$(c_grn "listening") port $port"
        else
            printf '    %-12s %s\n' "$name" "$(c_red "not listening") port $port"
        fi
    done
    echo ""
    if http_responds "$API_PORT" "/health"; then
        printf '    %-12s %s\n' "API /health" "$(c_grn "responding") http://localhost:$API_PORT/health"
    else
        printf '    %-12s %s\n' "API /health" "$(c_red "not responding")"
    fi
    if http_responds "$WEB_PORT"; then
        printf '    %-12s %s\n' "Web" "$(c_grn "responding") http://localhost:$WEB_PORT"
    else
        printf '    %-12s %s\n' "Web" "$(c_red "not responding")"
    fi
    echo ""
}

cmd_build() {
    echo ""
    echo -e "$(c_blu "══════════════════════════════════════════════")"
    echo -e "  $(c_bold "Building zanweb")"
    echo -e "$(c_blu "══════════════════════════════════════════════")"
    echo ""
    echo "Generating Prisma client ..."
    pnpm --filter @zanweb/prisma prisma:generate
    echo ""
    echo "Building all workspaces ..."
    pnpm -r build
    echo ""
    echo "Preparing standalone web assets ..."
    web_prepare_standalone
    echo ""
    echo "$(c_grn "Build complete")"
}

usage() {
    cat <<EOF
$(c_blu "╔════════════════════════════════════════════════════════╗")
$(c_blu "║")  $(c_bold "CSC Zanzibar Web — manage.sh")                       $(c_blu "║")
$(c_blu "╚════════════════════════════════════════════════════════╝")

  Mode: $(c_bold "dev") (default) or $(c_bold "prod")
  Set via ZANWEB_MODE=prod or pass --dev / --prod to relevant commands.

  $(c_bold "Usage:") ./manage.sh <command> [--dev|--prod]

  $(c_bold "Service control:")
    start              Start backing services (postgres, redis, minio, clamav)
    stop               Stop apps, then backing services
    restart            Restart backing services only
    restart-all        Restart everything (services + apps)
    status             Show service and app status

  $(c_bold "App control:")
    start-apps         Start API + Web (default mode: dev)
    stop-apps          Stop API + Web
    restart-apps       Restart API + Web
    dev                Start backing services + apps in DEV mode
    prod               Build, then start everything in PROD mode

  $(c_bold "Utilities:")
    build              Build all workspaces (Prisma + API + Web)
    logs [svc] [n]     Show recent logs (api, web, minio, all)
    health             HTTP/port health checks
    help               Show this help

  $(c_bold "Examples:")
    ./manage.sh start
    ./manage.sh dev
    ./manage.sh prod
    ZANWEB_MODE=prod ./manage.sh start-apps
    ./manage.sh stop
    ./manage.sh restart-all
    ./manage.sh status
EOF
}

# =============================================================================
# COMMAND ROUTER
# =============================================================================
main() {
    local cmd="${1:-}"
    shift || true

    case "$cmd" in
        start)          cmd_start "$@" ;;
        stop)           cmd_stop ;;
        restart)        cmd_restart ;;
        start-apps)     cmd_start_apps "$@" ;;
        stop-apps)      cmd_stop_apps ;;
        restart-apps)   cmd_restart_apps ;;
        restart-all)    cmd_restart_all "$@" ;;
        dev)            cmd_dev "$@" ;;
        prod)           cmd_prod "$@" ;;
        status)         cmd_status ;;
        logs)           cmd_logs "${1:-all}" "${2:-50}" ;;
        health)         cmd_health ;;
        build)          cmd_build ;;
        help|--help|-h) usage ;;
        "")             usage ;;
        *)
            echo "$(c_red "Unknown command: $cmd")"
            usage
            exit 1
            ;;
    esac
}

main "$@"
