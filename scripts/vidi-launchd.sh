#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT_SRC="$PROJECT_DIR/local.vidi.plist"
PROXY_SRC="$PROJECT_DIR/local.vidi-proxy.plist"
AGENT_DST="$HOME/Library/LaunchAgents/local.vidi.plist"
PROXY_DST="/Library/LaunchDaemons/local.vidi-proxy.plist"
AGENT_LABEL="local.vidi"
PROXY_LABEL="local.vidi-proxy"
AGENT_DOMAIN="gui/$(id -u)"
PROXY_DOMAIN="system"

sudo_run() {
  osascript -e "do shell script \"$1\" with administrator privileges" >/dev/null
}

install_plists() {
  cp "$AGENT_SRC" "$AGENT_DST"
  sudo_run "cp '$PROXY_SRC' '$PROXY_DST'"
  echo "plists installed:"
  echo "  $AGENT_DST"
  echo "  $PROXY_DST"
}

load_agent() {
  if launchctl print "$AGENT_DOMAIN/$AGENT_LABEL" >/dev/null 2>&1; then
    launchctl kickstart -k "$AGENT_DOMAIN/$AGENT_LABEL"
  else
    launchctl bootstrap "$AGENT_DOMAIN" "$AGENT_DST"
  fi
}

load_proxy() {
  sudo_run "if launchctl print system/$PROXY_LABEL >/dev/null 2>&1; then launchctl kickstart -k system/$PROXY_LABEL; else launchctl bootstrap system '$PROXY_DST'; fi"
}

start_all() {
  load_agent
  load_proxy
  echo "started: $AGENT_LABEL + $PROXY_LABEL"
}

stop_all() {
  launchctl bootout "$AGENT_DOMAIN/$AGENT_LABEL" 2>/dev/null || true
  sudo_run "launchctl bootout system/$PROXY_LABEL 2>/dev/null || true"
  echo "stopped"
}

status_all() {
  echo "== $AGENT_LABEL (user, :8080) =="
  launchctl print "$AGENT_DOMAIN/$AGENT_LABEL" 2>/dev/null | grep -E "state =|program =" || echo "  not loaded"
  echo "== $PROXY_LABEL (root, :80) =="
  launchctl print system/$PROXY_LABEL 2>/dev/null | grep -E "state =|program =" || echo "  not loaded"
  echo "== http://vidi.local =="
  curl -s -o /dev/null -w "  HTTP %{http_code}\n" --max-time 5 http://vidi.local/ || echo "  unreachable"
}

case "${1:-}" in
  install)  install_plists ;;
  start)    start_all ;;
  stop)     stop_all ;;
  restart)  stop_all; start_all ;;
  status)   status_all ;;
  logs)     tail -f /tmp/vidi.log /tmp/vidi-proxy.log ;;
  *)
    echo "usage: $0 {install|start|stop|restart|status|logs}"
    echo "  install  复制 plist 到系统位置（proxy 需密码）"
    echo "  start    加载/重启两个 job"
    echo "  stop     卸载两个 job"
    echo "  restart  重启两个 job"
    echo "  status   查看两个 job 状态 + 站点可达性"
    echo "  logs     实时查看日志"
    exit 1
    ;;
esac
