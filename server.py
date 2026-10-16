import http.server
import socketserver
import socket
import os
import sys

PORT = int(os.environ.get("PORT", 3000))
HOST = "0.0.0.0"
ROOT = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, format, *args):
        sys.stdout.write("  %s - %s\n" % (self.address_string(), format % args))

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

if __name__ == "__main__":
    os.chdir(ROOT)
    with ReusableTCPServer((HOST, PORT), Handler) as httpd:
        print("")
        print("  XYREX Server berjalan")
        print("  -------------------------------")
        print("  Local   : http://localhost:%d" % PORT)
        print("  Network : http://%s:%d" % (get_local_ip(), PORT))
        print("")
        print("  Tekan CTRL+C untuk stop.")
        print("")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Server dihentikan.")
