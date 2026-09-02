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

resolve_node_bin() {
  if ! command -v node >/dev/null 2>&1; then
    echo "error: node not found on PATH" >&2
    exit 1
  fi
  node -p 'process.execPath'
}

render_plist() {
  local src="$1" dest="$2" node_bin="$3"
  local py
  py="$(command -v python3 2>/dev/null || true)"
  if [[ -z "$py" && -x /usr/bin/python3 ]]; then
    py=/usr/bin/python3
  fi
  if [[ -z "$py" ]]; then
    echo "error: python3 is required to render launchd plists" >&2
    exit 1
  fi
  "$py" - "$src" "$dest" "$PROJECT_DIR" "$node_bin" <<'PY'
import sys

src, dest, project, node = sys.argv[1:5]

def xml_escape(value):
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

text = open(src, encoding="utf-8").read()
text = text.replace("@@PROJECT_DIR@@", xml_escape(project))
text = text.replace("@@NODE_BIN@@", xml_escape(node))
if "@@PROJECT_DIR@@" in text or "@@NODE_BIN@@" in text:
    sys.stderr.write("error: plist template placeholders were not substituted\n")
    sys.exit(1)
open(dest, "w", encoding="utf-8").write(text)
PY
}

install_plists() {
  local node_bin tmp_agent tmp_proxy
  node_bin="$(resolve_node_bin)"
  tmp_agent="$(mktemp)"
  tmp_proxy="$(mktemp)"
  render_plist "$AGENT_SRC" "$tmp_agent" "$node_bin"
  render_plist "$PROXY_SRC" "$tmp_proxy" "$node_bin"
  mkdir -p "$(dirname "$AGENT_DST")"
  cp "$tmp_agent" "$AGENT_DST"
  sudo_run "cp '$tmp_proxy' '$PROXY_DST'"
  rm -f "$tmp_agent" "$tmp_proxy"
  echo "plists installed:"
  echo "  $AGENT_DST"
  echo "  $PROXY_DST"
  echo "  node: $node_bin"
  echo "  project: $PROJECT_DIR"
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
    echo "  install  按本机项目路径和 node 渲染 plist 并安装（proxy 需密码）"
    echo "  start    加载/重启两个 job"
    echo "  stop     卸载两个 job"
    echo "  restart  重启两个 job"
    echo "  status   查看两个 job 状态 + 站点可达性"
    echo "  logs     实时查看日志"
    exit 1
    ;;
esac
