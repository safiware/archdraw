# Security

## Reporting a vulnerability

Please report security problems privately, not in a public issue:

- through GitHub: [Report a vulnerability](https://github.com/safiware/archdraw/security/advisories/new), or
- by email to **security@archdraw.dev**.

Include what you found, how to reproduce it, and which version (the release you downloaded; Help › Report a problem fills it in). We acknowledge reports within three working days, keep you informed while we fix it, and credit you in the release notes unless you prefer otherwise.

## Supported versions

Security fixes go into the latest release. archdraw updates itself on macOS and from the AppImage on Linux; deb users are told when a new version is out.

## How archdraw handles what it touches

- **AI keys** are encrypted with the OS keychain (Keychain on macOS, Secret Service or KWallet on Linux) and stored in an owner-only file. On a Linux desktop without a keyring, the app says so: the key then has only basic protection.
- **Your code** never leaves your machine except to the AI provider you configured, and only what the agent reads for a check or a conversation. The agent's tools are read-only and refuse `.env` files, keys, credential folders, Terraform state and anything `.gitignore` excludes.
- **The desktop app** runs its own server on `127.0.0.1` with a per-launch secret; nothing listens on other interfaces. Diagram SVG is sanitized before display and the page runs under a strict Content Security Policy.
- **Git** runs with hooks, fsmonitor and `ext::` transports disabled.
- **No telemetry.** archdraw contacts only your AI provider, GitHub (for your repos and for updates) and nothing else.
