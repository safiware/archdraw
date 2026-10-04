# Changelog

All notable changes to archdraw. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org) (in 0.x, a minor version may change behavior).

## 0.1.0 — unreleased

The first public release.

- Desktop app for macOS 13+ (Apple Silicon and Intel) and Linux (AppImage, deb), and the same app as a self-hosted server.
- Diagrams as text in each repo's `.archdraw/` folder, drawn on a canvas; a box with a link opens the diagram one level deeper.
- An agent that reads the code (read-only) and proposes diagrams you accept, with your own OpenAI, Anthropic, Google or OpenRouter key.
- Per-project schedule (hourly, daily or only when you ask) that drafts one update when the architecture changes, reviewed in the Inbox as a colored diff and published as a pull request or a commit.
- Export of `ARCHITECTURE.md` and every diagram for coding agents.
- A two-minute tour on a sample project that needs no key.
