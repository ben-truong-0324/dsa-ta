from flask import Flask, render_template, request, redirect, url_for, send_from_directory, jsonify,session
from kafka import KafkaProducer, KafkaConsumer
from kafka.errors import NoBrokersAvailable
import uuid
from authlib.integrations.flask_client import OAuth
import json
import time
import logging
import base64
import requests

app = Flask(__name__)
app.secret_key = 'temp_secret'

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FASTAPI_URL='fastapi.dsata.svc.cluster.local:80',

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/submit", methods=["POST"])
def submit_problems():
    problem_text = request.form.get("problems")
    if not problem_text:
        return "No input received", 400

    # Start a background batch
    response = requests.post(
        f"{FASTAPI_URL}/process-problems-batch",
        data=problem_text,
        headers={"Content-Type": "text/plain"}
    )
    if response.ok:
        batch_id = response.json()["batch_id"]
        return redirect(url_for("batch_status", batch_id=batch_id))
    return "Error submitting batch", 500

@app.route("/batch/<batch_id>")
def batch_status(batch_id):
    response = requests.get(f"{FASTAPI_URL}/batch-status/{batch_id}")
    if not response.ok:
        return f"Batch {batch_id} not found", 404
    return render_template("practices_add.html", batch=response.json())

@app.route("/all-practices")
def all_practices():
    response = requests.get(f"{FASTAPI_URL}/problems")
    if response.ok:
        return render_template("practices_all.html", problems=response.json())
    return "Failed to load practices", 500

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

