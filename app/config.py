"""Configuration for the ISP History Flask app. All values come from env vars
with sensible defaults so it runs both locally and behind Caddy (see
docs/DEPLOYMENT.md)."""

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Path prefix the app is served under, e.g. "/isp-history" behind Caddy's
# `handle_path /isp-history/*`. Empty string when running directly.
BASE_PATH = os.environ.get("ISP_HISTORY_BASE_PATH", "").rstrip("/")

PORT = int(os.environ.get("ISP_HISTORY_PORT", "4004"))

# Directory holding the git-tracked data files (data/isps/*.json +
# data/transitions.json).
DATA_DIR = os.environ.get("ISP_HISTORY_DATA", os.path.join(BASE_DIR, "data"))
