# Deployment

The app is a standard Flask app designed to run **behind Caddy** exactly like your
other apps (see the `code.narx.net` config). It binds to `127.0.0.1:<port>` and Caddy
reverse-proxies to it.

## 1. Configuration (env vars)

The app reads everything from environment variables:

| Variable | Default | Meaning |
|----------|---------|---------|
| `ISP_HISTORY_PORT` | `4004` | Port Flask binds to on 127.0.0.1 |
| `ISP_HISTORY_BASE_PATH` | `/isp-history` | URL prefix Caddy serves this under |
| `ISP_HISTORY_DATA` | `<repo>/data` | Directory holding the git-tracked data files (`isps/*.json` + `transitions.json`) |

The app is **read-only**: there is no login, no session secret, and no write
routes. Data is edited via pull request against `data/` (see the repo README).

> **Deployed at `https://code.narx.net/isp-history/`** (Caddy `handle_path /isp-history/*`
> → `reverse_proxy localhost:4004`). Note: `/ixp-history` is a *different* existing app
> (IXP-History, port 4005) — don't confuse the two.

## 2. systemd unit

A ready-to-use unit is in `tools/isp_history.service`. Install it:

```sh
sudo cp tools/isp_history.service /etc/systemd/system/
# edit User=/WorkingDirectory= if needed
sudo systemctl daemon-reload
sudo systemctl enable --now isp_history
sudo systemctl status isp_history
```

The unit runs `python3 app/server.py` from the repo directory as the current user.

Because the data is the git-tracked `data/` directory, deploying a data update is
just a `git pull` — the app notices the changed files (it re-reads the store when
their mtime/size change) and serves the new graph on the next request. Restart the
unit if you want to be certain.

## 3. Caddy

Add a block to your existing `code.narx.net` config, following the same pattern as
the other apps:

```
	# ISP-History (Flask, backend :4004)
	redir /isp-history /isp-history/ 301
	handle_path /isp-history/* {
		reverse_proxy localhost:4004
	}
```

Enable compression globally (once, for all apps) inside `code.narx.net {`:

```
code.narx.net {
	encode gzip zstd
	# ... existing handle_path blocks
}
```

Then `caddy fmt --overwrite && systemctl reload caddy` (or `systemctl start caddy` if
it was failed). The app itself sends `ETag`/`Cache-Control` for `/api/graph`
(`app/server.py`), so Caddy’s `encode` compresses the 277 KB graph to ~38 KB
and revalidation returns `304`.

**How the prefix works:** Caddy's `handle_path` strips the `/isp-history` prefix
before proxying, so Flask only ever sees `/`, `/isp/<slug>`, etc. The app sets
`SCRIPT_NAME=/isp-history` (via `BasePathMiddleware` in `app/server.py`) so all
generated URLs (`url_for`, graph links, redirects) include the prefix. Change the
Caddy path and `ISP_HISTORY_BASE_PATH` together and they must match.

> Note: if you use a prefix that is *not* `/isp-history`, set
> `ISP_HISTORY_BASE_PATH` to match exactly (no trailing slash).

## 4. Local development

```sh
python3 -m pytest tests/          # run the test suite
python3 tools/qa_report.py        # data health report
python3 tools/layout_score.py     # timeline layout metrics
ISP_HISTORY_BASE_PATH= python3 app/server.py
open http://127.0.0.1:4004/
```

Setting `ISP_HISTORY_BASE_PATH=` (empty) runs the app at the root — handy when
browsing directly without Caddy.

Editing the data means editing `data/isps/<slug>.json` and `data/transitions.json`
and sending a pull request. After pulling changes locally, restart the server or
just refresh a page — the app re-reads the data files when they change (see
`app/db.py`).