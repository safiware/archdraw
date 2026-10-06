# Changelog

All notable changes to archdraw. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org) (in 0.x, a minor version may change behavior).

## 0.1.1 — 2026-10-06

**Updating from 0.1.0:** run `curl -fsSL https://archdraw.dev/install.sh | sh` again. 0.1.0 announces the new version but does not install it; on a Mac, the command also spares you the Open Anyway step a browser download asks for.

### Fixed

- Arch Agent no longer stops at "Connection error." when one connection to the AI provider drops: a request to the model is sent again up to twice, as the OpenAI and Anthropic SDKs do by default (the scheduled change check and its drafts too). An error that remains says why, for example "Connection error (getaddrinfo ENOTFOUND api.openai.com)." (#49)
- On a Mac, archdraw no longer asks for your login password ("archdraw wants to use your confidential information stored in 'archdraw Safe Storage'") when it starts. The keychain is opened only when you save or use an AI key; if you press Deny there, saving the key says so instead of keeping it unprotected. (#47)
- A diagram that does not render names the line of the mistake, `line 14: node "oops": "rigth" is not a direction`, in the editor, on the card and in Arch Agent's proposals, and the editor marks that line. Thanks to @cracthatrock for the first part. (#44)
- Adding a project refuses a title that is empty or longer than 80 characters, as renaming one does. (#43)

### Changed

- The agent is called Arch Agent. (#48)

## 0.1.0 — 2026-10-06

The first public release.

- Desktop app for macOS 13+ (Apple Silicon and Intel) and Linux (AppImage, deb), and the same app as a self-hosted server.
- Install with one command on either system: `curl -fsSL https://archdraw.dev/install.sh | sh`. It checks the download against the release's checksums. On a Mac it installs into Applications and the app opens with no extra step; see [docs/install-mac.md](docs/install-mac.md) for the `.dmg` route.
- Diagrams as text in each repo's `.archdraw/` folder, drawn on a canvas; a box with a link opens the diagram one level deeper.
- An agent that reads the code (read-only) and proposes diagrams you accept, with your own OpenAI, Anthropic, Google or OpenRouter key.
- Per-project schedule (hourly, daily or only when you ask) that drafts one update when the architecture changes, reviewed in the Inbox as a colored diff and published as a pull request or a commit. A change check whose answer cannot be read leaves the commits unchecked and says so.
- Export of `ARCHITECTURE.md` and every diagram for coding agents.
- A two-minute tour on a sample project that needs no key.
- The self-hosted server runs on Node.js 22.19 or later and refuses a setting it cannot use with a message.
- Fair source under the [Functional Source License (FSL-1.1-ALv2)](LICENSE): free to use, change and self-host, at work too; each release becomes Apache-2.0 two years after it ships. The diagram engine, started from [reladraw](https://github.com/reladraw/reladraw), stays Apache-2.0.

Known in this release: the macOS build is not yet notarized by Apple. Installed with the command above it opens normally; a `.dmg` downloaded in a browser asks once for Open Anyway. This build announces a new version and links to it, rather than updating itself.
