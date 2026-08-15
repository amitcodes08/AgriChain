#!/bin/bash

# ============================================================================
#  AgriChain Trace — Start All Services
# ============================================================================
#
#  Usage:
#    ./run.sh              Start everything (MongoDB, AI, Backend, Frontend)
#    ./run.sh --docker     Use Docker Compose instead
#    ./run.sh --stop       Stop all running services
#    ./run.sh --status     Check what's running
#    ./run.sh --install    Install dependencies only (no start)
#
#  Services (local mode):
#    MongoDB       →  localhost:27017
#    AI Service    →  localhost:8000   (Python / FastAPI)
#    Backend API   →  localhost:4000   (Node / Express)
#    Frontend      →  localhost:3000   (Next.js)
#
# ============================================================================

set -e

# ── Colours ─────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Project root ────────────────────────────────────────────────────────────

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
AI_DIR="$PROJECT_DIR/ai-service"

PID_DIR="$PROJECT_DIR/.pids"
LOG_DIR="$PROJECT_DIR/.logs"

# ── Helpers ─────────────────────────────────────────────────────────────────

banner() {
  echo ""
  echo -e "${GREEN}${BOLD}"
  echo "  🌱 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  🚜  AgriChain Trace — Farm-to-Fork Dashboard"
  echo "  🌾 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "${NC}"
}

log_info()  { echo -e "  ${GREEN}✔${NC}  $1"; }
log_warn()  { echo -e "  ${YELLOW}⚠${NC}  $1"; }
log_error() { echo -e "  ${RED}✖${NC}  $1"; }
log_step()  { echo -e "\n  ${BLUE}${BOLD}▸ $1${NC}"; }

ensure_dir() {
  mkdir -p "$PID_DIR" "$LOG_DIR"
}

# ── Stop ────────────────────────────────────────────────────────────────────

stop_services() {
  banner
  log_step "Stopping all services…"

  local stopped=0

  for pid_file in "$PID_DIR"/*.pid; do
    [ -f "$pid_file" ] || continue
    local name
    name=$(basename "$pid_file" .pid)
    local pid
    pid=$(cat "$pid_file")

    if kill -0 "$pid" 2>/dev/null; then
      # Kill the process group so child processes (tsx watch, uvicorn workers) die too
      kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
      log_info "$name stopped (PID $pid)"
      stopped=$((stopped + 1))
    fi
    rm -f "$pid_file"
  done

  if [ "$stopped" -eq 0 ]; then
    log_warn "No services were running."
  else
    log_info "Stopped $stopped service(s)."
  fi
  echo ""
}

# ── Status ──────────────────────────────────────────────────────────────────

check_status() {
  banner
  log_step "Service status"

  local any_running=false

  for pid_file in "$PID_DIR"/*.pid; do
    [ -f "$pid_file" ] || continue
    local name
    name=$(basename "$pid_file" .pid)
    local pid
    pid=$(cat "$pid_file")

    if kill -0 "$pid" 2>/dev/null; then
      log_info "${BOLD}$name${NC} is running (PID $pid)"
      any_running=true
    else
      log_warn "${BOLD}$name${NC} is NOT running (stale PID $pid)"
      rm -f "$pid_file"
    fi
  done

  if [ "$any_running" = false ]; then
    log_warn "No services are running."
  fi

  echo ""
  echo -e "  ${CYAN}Logs:${NC}  $LOG_DIR/"
  echo ""
}

# ── Install ─────────────────────────────────────────────────────────────────

install_deps() {
  log_step "Installing dependencies…"

  # Backend
  if [ -d "$BACKEND_DIR" ] && [ -f "$BACKEND_DIR/package.json" ]; then
    echo -e "  ${CYAN}→${NC} Backend (npm install)…"
    (cd "$BACKEND_DIR" && npm install --silent 2>&1) || log_warn "Backend npm install had warnings"
    log_info "Backend dependencies installed"
  fi

  # Frontend
  if [ -d "$FRONTEND_DIR" ] && [ -f "$FRONTEND_DIR/package.json" ]; then
    echo -e "  ${CYAN}→${NC} Frontend (npm install)…"
    (cd "$FRONTEND_DIR" && npm install --silent 2>&1) || log_warn "Frontend npm install had warnings"
    log_info "Frontend dependencies installed"
  fi

  # AI Service
  if [ -d "$AI_DIR" ] && [ -f "$AI_DIR/requirements.txt" ]; then
    echo -e "  ${CYAN}→${NC} AI Service (pip install)…"
    if [ ! -d "$AI_DIR/.venv" ]; then
      python3 -m venv "$AI_DIR/.venv"
      log_info "Created Python virtual environment"
    fi
    (source "$AI_DIR/.venv/bin/activate" && pip install -q -r "$AI_DIR/requirements.txt" 2>&1) || log_warn "AI pip install had warnings"
    log_info "AI service dependencies installed"
  fi
}

# ── Setup env files ─────────────────────────────────────────────────────────

setup_env() {
  # Backend .env
  if [ -f "$BACKEND_DIR/.env.example" ] && [ ! -f "$BACKEND_DIR/.env" ]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    log_info "Created backend/.env from .env.example"
  fi

  # Frontend .env
  if [ -f "$FRONTEND_DIR/.env.example" ] && [ ! -f "$FRONTEND_DIR/.env.local" ] && [ ! -f "$FRONTEND_DIR/.env" ]; then
    cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env.local"
    log_info "Created frontend/.env.local from .env.example"
  fi

  # AI Service .env
  if [ -f "$AI_DIR/.env.example" ] && [ ! -f "$AI_DIR/.env" ]; then
    cp "$AI_DIR/.env.example" "$AI_DIR/.env"
    log_info "Created ai-service/.env from .env.example"
  fi
}

# ── Start service in background ─────────────────────────────────────────────

start_bg() {
  local name="$1"
  local dir="$2"
  shift 2
  local cmd="$*"

  # Check if already running
  if [ -f "$PID_DIR/$name.pid" ]; then
    local old_pid
    old_pid=$(cat "$PID_DIR/$name.pid")
    if kill -0 "$old_pid" 2>/dev/null; then
      log_warn "$name is already running (PID $old_pid). Skipping."
      return 0
    fi
    rm -f "$PID_DIR/$name.pid"
  fi

  local log_file="$LOG_DIR/$name.log"

  # Start in new process group (setsid) so we can kill the tree later
  (cd "$dir" && setsid $cmd > "$log_file" 2>&1 &
   echo $! > "$PID_DIR/$name.pid")

  sleep 0.5
  local pid
  pid=$(cat "$PID_DIR/$name.pid" 2>/dev/null || echo "")

  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    log_info "$name started (PID $pid) → log: .logs/$name.log"
  else
    log_error "$name failed to start. Check: $log_file"
    return 1
  fi
}

# ── Wait for a port ─────────────────────────────────────────────────────────

wait_for_port() {
  local name="$1"
  local port="$2"
  local timeout="${3:-30}"
  local elapsed=0

  printf "  ${CYAN}⏳${NC} Waiting for $name on port $port"

  while ! nc -z 127.0.0.1 "$port" 2>/dev/null; do
    sleep 1
    elapsed=$((elapsed + 1))
    printf "."
    if [ "$elapsed" -ge "$timeout" ]; then
      echo ""
      log_warn "$name did not respond on port $port within ${timeout}s"
      return 1
    fi
  done
  echo ""
  log_info "$name is ready on port $port"
}

# ── Check prerequisites ────────────────────────────────────────────────────

check_prereqs() {
  log_step "Checking prerequisites…"

  local missing=()

  command -v node >/dev/null 2>&1 || missing+=("node")
  command -v npm >/dev/null 2>&1  || missing+=("npm")
  command -v python3 >/dev/null 2>&1 || missing+=("python3")

  if [ ${#missing[@]} -gt 0 ]; then
    log_error "Missing required tools: ${missing[*]}"
    echo -e "  Install them before running this script."
    exit 1
  fi

  log_info "node $(node -v), npm $(npm -v), python3 $(python3 --version 2>&1 | cut -d' ' -f2)"

  # Check MongoDB
  if command -v mongosh >/dev/null 2>&1; then
    if mongosh --quiet --eval "db.adminCommand('ping').ok" 2>/dev/null | grep -q 1; then
      log_info "MongoDB is running on port 27017"
    else
      log_warn "MongoDB is installed but not running. Starting it…"
      if command -v brew >/dev/null 2>&1; then
        brew services start mongodb-community 2>/dev/null || true
        sleep 2
      fi
    fi
  elif nc -z 127.0.0.1 27017 2>/dev/null; then
    log_info "MongoDB is reachable on port 27017"
  else
    log_warn "MongoDB is not running on port 27017."
    echo -e "    ${YELLOW}Start it manually or use Docker:${NC}"
    echo -e "    ${CYAN}brew services start mongodb-community${NC}"
    echo -e "    ${CYAN}docker run -d -p 27017:27017 mongo:7${NC}"
    echo ""
    read -p "    Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi
}

# ── Docker mode ─────────────────────────────────────────────────────────────

run_docker() {
  banner
  log_step "Starting with Docker Compose…"

  if ! command -v docker >/dev/null 2>&1; then
    log_error "Docker is not installed."
    exit 1
  fi

  cd "$PROJECT_DIR"
  docker compose up --build "$@"
}

# ── Main: local mode ───────────────────────────────────────────────────────

run_local() {
  banner
  ensure_dir
  check_prereqs
  setup_env
  install_deps

  log_step "Starting services…"
  echo ""

  # 1. AI Service (Python / FastAPI)
  echo -e "  ${CYAN}🤖 AI Service${NC} (FastAPI on :8000)"
  if [ -d "$AI_DIR/.venv" ]; then
    start_bg "ai-service" "$AI_DIR" \
      "$AI_DIR/.venv/bin/python" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
  else
    start_bg "ai-service" "$AI_DIR" \
      python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
  fi

  # 2. Backend API (Node / Express)
  echo -e "  ${CYAN}🌐 Backend API${NC} (Express on :4000)"
  start_bg "backend" "$BACKEND_DIR" npm run dev

  # 3. Frontend (Next.js)
  echo -e "  ${CYAN}🎨 Frontend${NC} (Next.js on :3000)"
  start_bg "frontend" "$FRONTEND_DIR" npm run dev

  # Wait for services to be ready
  echo ""
  log_step "Waiting for services to come online…"
  wait_for_port "AI Service" 8000 20
  wait_for_port "Backend" 4000 20
  wait_for_port "Frontend" 3000 30

  # Done!
  echo ""
  echo -e "  ${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "  ${GREEN}${BOLD}  🌾 All services are running!${NC}"
  echo -e "  ${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "  ${BOLD}Dashboard:${NC}     ${CYAN}http://localhost:3000${NC}"
  echo -e "  ${BOLD}API:${NC}           ${CYAN}http://localhost:4000${NC}"
  echo -e "  ${BOLD}AI Service:${NC}    ${CYAN}http://localhost:8000${NC}"
  echo -e "  ${BOLD}MongoDB:${NC}       ${CYAN}mongodb://localhost:27017/agrichain${NC}"
  echo ""
  echo -e "  ${BOLD}Logs:${NC}          $LOG_DIR/"
  echo -e "  ${BOLD}Stop:${NC}          ${CYAN}./run.sh --stop${NC}"
  echo -e "  ${BOLD}Status:${NC}        ${CYAN}./run.sh --status${NC}"
  echo ""
  echo -e "  ${YELLOW}Tip:${NC} Seed the database with demo data:"
  echo -e "       ${CYAN}cd backend && npm run seed${NC}"
  echo ""
}

# ── Entrypoint ──────────────────────────────────────────────────────────────

case "${1:-}" in
  --docker|-d)
    shift
    run_docker "$@"
    ;;
  --stop|-s)
    ensure_dir
    stop_services
    ;;
  --status|-S)
    ensure_dir
    check_status
    ;;
  --install|-i)
    banner
    ensure_dir
    install_deps
    echo ""
    log_info "All dependencies installed. Run ${CYAN}./run.sh${NC} to start."
    echo ""
    ;;
  --help|-h)
    banner
    echo -e "  ${BOLD}Usage:${NC}"
    echo -e "    ./run.sh              Start all services locally"
    echo -e "    ./run.sh --docker     Use Docker Compose"
    echo -e "    ./run.sh --stop       Stop all running services"
    echo -e "    ./run.sh --status     Check what's running"
    echo -e "    ./run.sh --install    Install dependencies only"
    echo -e "    ./run.sh --help       Show this help"
    echo ""
    ;;
  *)
    run_local
    ;;
esac
