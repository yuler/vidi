#!/usr/bin/python3
import os
import socket
import threading

upstream = os.environ.get("UPSTREAM") or "127.0.0.1:8080"
host, _, port_s = upstream.partition(":")
port = int(port_s or 8080)


def pipe(src, dst):
    try:
        while True:
            data = src.recv(65536)
            if not data:
                break
            dst.sendall(data)
    except OSError:
        pass
    finally:
        try:
            dst.shutdown(socket.SHUT_WR)
        except OSError:
            pass


server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind(("0.0.0.0", 80))
server.listen(128)
print("proxy 80 -> %s" % upstream, flush=True)

while True:
    client, _ = server.accept()
    try:
        upstream_sock = socket.create_connection((host, port))
    except OSError:
        client.close()
        continue
    threading.Thread(target=pipe, args=(client, upstream_sock), daemon=True).start()
    threading.Thread(target=pipe, args=(upstream_sock, client), daemon=True).start()
