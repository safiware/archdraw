# Running archdraw as a server

The desktop app runs archdraw's server inside the app. You can also run the same server on its own, for example on a home server or a dev box, and open it in a browser. Everything else (projects, the Inbox, the agent, the schedule) works the same.

## Build and start

You need Node 22.19 or later, [Bun](https://bun.sh) (for the UI's lockfile) and git; the GitHub CLI signed in (`gh auth login`) to open pull requests.

```sh
git clone https://github.com/safiware/archdraw && cd archdraw
cd engine && npm ci && npm run build && cd ../app
npm ci && (cd ui && bun install --frozen-lockfile) && npm run build:all
ARCHDRAW_GATE=token node dist/server.mjs
```

In token mode the server prints a sign-in link (`archdraw: open http://127.0.0.1:8088/?token=…`). Opening it sets a cookie for that browser session. Set `ARCHDRAW_TOKEN` to keep the same link across restarts.

The server listens on `127.0.0.1` only. To reach it from other devices, put it behind something that authenticates them, such as [Tailscale Serve](https://tailscale.com/kb/1312/serve) with the tailnet gate below. Do not expose it to the internet.

## Who may connect

| `ARCHDRAW_GATE` | Who gets in |
|---|---|
| `token` | Anyone with the sign-in link, from this machine (the Host must be the loopback address). |
| `tailnet` | One Tailscale user, through Tailscale Serve, from their own devices. Set `ARCHDRAW_PRINCIPAL` to their Tailscale login (the server refuses to start without it). `ARCHDRAW_DENY_NODES` lists machines (their short Tailscale names, comma-separated, matched exactly) to refuse even when signed in as that user, such as a build box that runs agents. `ARCHDRAW_ALLOW_LOCAL=1` also admits this machine's own user on loopback. Linux only (it checks the socket owner in `/proc`). |
| `local` | This machine's own user, for development and tests. Linux only. |

## Settings

| Variable | Default | What it does |
|---|---|---|
| `ARCHDRAW_PORT` | `8088` | The port. |
| `ARCHDRAW_HOST` | `127.0.0.1` | The address to listen on. Keep it on loopback or a private interface. |
| `ARCHDRAW_HOME` | `~/.local/share/archdraw` | Projects, their clones, conversations and settings. |
| `ARCHDRAW_SECRETS` | `~/.config/archdraw/providers.env` | AI keys, one per line (`OPENAI_API_KEY=…`, `ANTHROPIC_API_KEY=…`, `GEMINI_API_KEY=…`, `OPENROUTER_API_KEY=…`). Make it readable only by you (`chmod 600`). Keys set in the environment work too. |
| `ARCHDRAW_SYNC` | on | `0` turns the scheduled checks off for the whole server. |
| `ARCHDRAW_FOLDER_ROOT` | none | When set, local folder projects must be inside this folder. |
| `ARCHDRAW_AUTHOR`, `ARCHDRAW_AUTHOR_EMAIL` | the machine's git identity | Who the server's commits come from. Use an address your Git host recognises; some deploy previews (Vercel, for one) refuse commits by unknown authors. |

## A systemd user unit

```ini
[Unit]
Description=archdraw

[Service]
WorkingDirectory=%h/archdraw/app
Environment=ARCHDRAW_GATE=tailnet
Environment=ARCHDRAW_PRINCIPAL=you@example.com
ExecStart=/usr/bin/node %h/archdraw/app/dist/server.mjs
Restart=always

[Install]
WantedBy=default.target
```

Then `systemctl --user enable --now archdraw`, `loginctl enable-linger $USER` so it keeps running after you log out, and `tailscale serve --bg --https=443 http://127.0.0.1:8088`.
