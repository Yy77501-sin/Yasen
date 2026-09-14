import os
import subprocess
import sys

from keep_alive import keep_alive


def _load_env_file(env_path=".env"):
    if not os.path.exists(env_path):
        return
    raw_bytes = b""
    with open(env_path, "rb") as f:
        raw_bytes = f.read()

    text = None
    for encoding in ("utf-8-sig", "utf-16", "utf-16-le", "utf-16-be"):
        try:
            text = raw_bytes.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        text = raw_bytes.decode("utf-8", errors="ignore")

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip().lstrip("\ufeff")
        if key and key not in os.environ:
            os.environ[key] = value.strip()


_load_env_file()
BOT_TOKEN = os.environ.get("BOT_TOKEN") or "8880668064:AAGHVzFpi0r0Wb2oI-VO4FGb05OwnHzyVlc"


def main():
    if not BOT_TOKEN:
        print("BOT_TOKEN is missing in environment.", file=sys.stderr)
        sys.exit(1)

    import time
    keep_alive()

    command = ["node", "src/index.js"]
    while True:
        try:
            print("[runner] Starting node src/index.js...")
            process = subprocess.Popen(command)
            process.wait()
            print(f"[runner] Node process exited with code {process.returncode}. Restarting in 3 seconds...")
            time.sleep(3)
        except KeyboardInterrupt:
            print("[runner] Shutting down cleanly.")
            break
        except Exception as e:
            print(f"[runner] Process error: {e}. Restarting in 5 seconds...", file=sys.stderr)
            time.sleep(5)


if __name__ == "__main__":
    main()
