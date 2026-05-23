import os

from dotenv import load_dotenv
from flask import Flask, redirect, render_template, url_for

load_dotenv()

app = Flask(__name__)
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:8000/api")


@app.context_processor
def inject_config():
    return {"backend_api_url": BACKEND_API_URL}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/admin/login")
def admin_login():
    return render_template("admin/login.html")


@app.route("/admin")
def admin_index():
    return redirect(url_for("admin_users"))


@app.route("/admin/users")
def admin_users():
    return render_template("admin/users.html", active_page="users")


@app.route("/admin/topics")
def admin_topics():
    return render_template("admin/topics.html", active_page="topics")


@app.route("/admin/appeals")
def admin_appeals():
    return render_template("admin/appeals.html", active_page="appeals")


if __name__ == "__main__":
    app.run(debug=True, port=3000)
