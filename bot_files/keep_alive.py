from flask import Flask
from threading import Thread
import os

app = Flask(__name__)


@app.route("/")
def home():
    return "I am alive"


def run():
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)


def keep_alive():
    thread = Thread(target=run, daemon=True)
    thread.start()
