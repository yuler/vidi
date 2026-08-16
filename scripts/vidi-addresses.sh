#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8080}"

primary_if() {
  route -n get default 2>/dev/null | awk '/interface:/{print $2}'
}

lan_ip() {
  local iface
  iface="$(primary_if)"
  [ -n "$iface" ] && ipconfig getifaddr "$iface" 2>/dev/null
}

reachable() {
  curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$1" 2>/dev/null || echo "fail"
}

echo "== iOS / Mac（原生支持 vidi.local）=="
echo "  http://vidi.local/"
echo ""

echo "== Android（不能解析 .local，用 IP）=="
LAN_IP="$(lan_ip || true)"
if [ -n "$LAN_IP" ]; then
  echo "  http://$LAN_IP/          (80 端口，proxy 转发)"
  echo "  http://$LAN_IP:${PORT}/   (直连后端)"
else
  echo "  未检测到局域网 IP（请确认 Mac 已连接网络）"
fi

echo ""
echo "== 可达性检查 =="
for url in "http://vidi.local/" "http://127.0.0.1:${PORT}/"; do
  code="$(reachable "$url")"
  printf "  %-28s %s\n" "$url" "$([ "$code" = "200" ] && echo "OK" || echo "失败 ($code)")"
done
