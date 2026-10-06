# Contributing to archdraw

Thanks for helping. archdraw is maintained by Safiware and built in the open: issues, pull requests, diagram-language ideas and documentation fixes are all welcome.

## Before you start

- **Bugs:** open an issue with the steps, what you expected and what happened. The app's Help menu has "Report a problem", which fills in your version and OS.
- **Features and bigger changes:** start a [Discussion](https://github.com/safiware/archdraw/discussions) or an issue first, so we can agree on the shape before you spend time on code.
- **Security problems:** do not open an issue; see [SECURITY.md](SECURITY.md).
- Good places to begin are labelled [`good first issue`](https://github.com/safiware/archdraw/labels/good%20first%20issue) and [`help wanted`](https://github.com/safiware/archdraw/labels/help%20wanted).

## The repo

| Folder | What it is |
|---|---|
| `engine/` | The diagram engine, started from [reladraw](https://github.com/reladraw/reladraw) 0.16.0 (Apache-2.0). Parse, layout, SVG. |
| `app/core/` | The library: projects, clones and worktrees, commits and pull requests, the sync, the agent and its read-only tools. No HTTP, no UI. |
| `app/server/` | The HTTP API (Hono) and the access gates (desktop token, Tailscale, local). |
| `app/ui/` | The React UI: canvas, Inbox, chat, tour. |
| `app/desktop/` | The Electron shell: window, tray, keychain, updates. |
| `app/e2e/` | End-to-end tests in a real browser and in Electron. |
| `app/core/assets/` | The agent's prompt and skills, and the tour's sample project. |

## Set up

You need Node 24, [Bun](https://bun.sh) (for the UI's lockfile) and git.

```sh
cd engine && npm ci && npm run build && cd ..
cd app && npm ci && (cd ui && bun install --frozen-lockfile)
node node_modules/electron/install.js   # npm 11 skips Electron's download step
```

Run it:

```sh
npm run build:all                      # the UI, the server bundle and the desktop bundle
ARCHDRAW_GATE=token node dist/server.mjs  # prints a sign-in link for the app in a browser
                                          # (ARCHDRAW_GATE=local also works on Linux)
npx electron desktop/app/main.mjs      # or the desktop window
```

## Checks

Everything CI runs, you can run:

```sh
npx tsc -p tsconfig.json --noEmit && (cd ui && npx tsc -b)   # types
npx vitest run && (cd ui && npx vitest run)                   # unit tests
npx playwright-core install chromium
npx tsx e2e/app.e2e.ts && npx tsx e2e/tour.e2e.ts             # the app and the tour in Chromium
xvfb-run -a npx tsx e2e/desktop.e2e.ts                        # the desktop shell (Linux)
```

A change that a user can see comes with a test that fails without it.

## Pull requests

- One change per pull request, with a short description of what changes for the user and how you checked it. For UI changes, add a screenshot.
- Keep the code like the code around it: names, comment density, and plain words in anything a user reads.
- **Sign the CLA once.** archdraw is released under the [Functional Source License (FSL-1.1-ALv2)](LICENSE), and it is also offered in hosted and commercial forms. So we ask everyone who contributes to sign a short, one-time [Contributor License Agreement](CLA.md). You keep the copyright and grant a license (not an assignment) that lets your contribution be used under the FSL, Apache-2.0 or commercial terms. In return, every contribution stays available under the license archdraw used when you sent it, which for the FSL means it becomes Apache-2.0 two years after each release.
- **How to sign.** On your first pull request, the `cla` check asks you to sign. Comment this sentence, exactly, on the pull request:

  ```
  I have read the archdraw CLA and I agree to its terms
  ```

  That signs it for every later pull request too. If you contribute as part of your job, you need your employer's permission first (section 4 of the CLA); for a company-wide agreement, email hello@archdraw.dev. Changes inside `engine/`, which is reladraw, stay Apache-2.0 like the rest of reladraw.

A maintainer reviews every pull request. We aim to answer within a week.

## Conduct

Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).

Maintainers: releasing is described in [docs/releasing.md](docs/releasing.md).
