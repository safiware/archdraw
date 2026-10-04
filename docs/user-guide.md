# archdraw user guide

## Install

**macOS 13 or later.** Download the `.dmg` for your Mac (Apple Silicon or Intel) from [Releases](https://github.com/safiware/archdraw/releases/latest), open it and drag archdraw to Applications. Or use Homebrew: `brew install --cask safiware/tap/archdraw`.

**Linux (x64).** On Debian and Ubuntu, install the `.deb` (`sudo apt install ./archdraw-*.deb`). Elsewhere, use the `.AppImage`: make it executable and run it. On Ubuntu 24.04 and later the AppImage can fail to start because of the system's sandbox rules; use the `.deb` there.

**What archdraw needs on your machine:**
- `git`. On a Mac, `xcode-select --install` installs it.
- The [GitHub CLI](https://cli.github.com), signed in with `gh auth login`, to open and merge pull requests and to reach private repos. Without it, set Settings › Approving an update to push straight to the branch.

The app checks both on first run and tells you what is missing.

## Your first project

On the first screen, paste a GitHub repo (`owner/name` or its URL) or choose a folder. archdraw makes its own copy of the repo; it never touches your working copy.

For a GitHub repo, archdraw asks how to keep its diagrams current:
- **Every hour**: for busy repos. One small AI check each hour that `main` moves.
- **Once a day**: a quiet daily look at what changed.
- **Only when I ask**: nothing runs on its own. Press Sync now in the Inbox when you want a check.

You can change this later in the project's settings. Checks run only while archdraw is open.

New to archdraw? "Just try the sample" runs a two-minute tour on a sample project. It needs no AI key.

## Diagrams

Each diagram is a card on the canvas. Double-click a card to fly in; a box with a link opens the diagram one level deeper. Source opens the diagram's text beside it: the card redraws as you type, and Save (⌘S or Ctrl+S) records the change.

Diagrams are files in the repo's `.archdraw/` folder: `<name>.archdraw` for the diagram, `<name>.md` for its explanation, and `order.json` for the reading order. The language is described in [engine/SYNTAX.md](../engine/SYNTAX.md).

The "…" beside a diagram renames, duplicates, archives or deletes it. Deleted diagrams stay in Archive and trash for 30 days.

## The agent

✦ Ask (or ⌘K) opens the agent. It reads the project's code and diagrams, answers questions about them, and proposes new or changed diagrams. A proposal appears beside the original; nothing changes until you press Accept.

The agent uses your own key. Add it in Settings, or paste it when the chat asks. archdraw supports OpenAI, Anthropic, Google and OpenRouter, and you choose the models in Settings. Daily and per-conversation spending caps are in Settings too.

## The Inbox

Every change to a GitHub project waits on the repo's `archdraw/update` branch until you approve it, whether you made it, the agent proposed it, or a scheduled check drafted it. The Inbox lists each project's waiting update: click a diagram to see it in color (green added, amber changed, red removed), then Approve or Discard.

Approve merges a pull request by default. If GitHub refuses, for example because a required check failed, the Inbox says which.

## Export for coding agents

Export writes `ARCHITECTURE.md` plus every diagram as text, a bundle you can give Claude Code, Cursor or Codex as context.

## What goes where

When a project is checked, archdraw sends the new commit messages, the names of the files they touch and the diagram outlines to your AI provider. When the architecture changed, the agent reads the code it needs and drafts the update. The agent never reads `.env` files, keys, credential folders, Terraform state, or anything your `.gitignore` excludes. archdraw has no telemetry and no account.

## Where archdraw keeps things

| | macOS | Linux |
|---|---|---|
| App data (projects, settings, conversations) | `~/Library/Application Support/archdraw` | `~/.config/archdraw` |
| Your AI key | the Keychain | the Secret Service (GNOME Keyring, KWallet) |

Help › Open the data folder shows it.

## Uninstall

Quit archdraw, delete the app (macOS) or remove the package (`sudo apt remove archdraw`), and delete the data folder above. Your repos keep their `.archdraw/` folders; delete those like any other file if you no longer want them.

## Trouble

- **"archdraw cannot open the repo"**: check the name, and for a private repo run `gh auth login`.
- **"Who should commits come from?"**: this machine's git has no name or email. Enter the ones you use on GitHub, or set them with `git config --global user.name` and `user.email`.
- **Approve fails with failing checks**: the repo's main branch requires checks the update has not passed yet. Open the pull request to see which.
- Something else: Help › Report a problem opens an issue with your version filled in.
