# Opening archdraw on a Mac

archdraw 0.1 for macOS is not yet notarized by Apple, so the first time you open it, macOS asks you to
confirm that you trust it. You do this once; after that it opens like any other app.

## The quick way

```sh
curl -fsSL https://archdraw.dev/install.sh | sh
```

It installs the right build for your Mac into Applications, after checking it against the release's checksums, and archdraw then opens with no extra steps. The rest of this page is for downloading the `.dmg` yourself.

## Install from the .dmg

1. Download the `.dmg` from [Releases](https://github.com/safiware/archdraw/releases/latest): `arm64` for Apple Silicon (M1 and later), `x64` for Intel.
2. Open it and drag **archdraw** into **Applications**.

## Open it the first time

**macOS 15 (Sequoia) and later**

1. Open **archdraw** from Applications. macOS says it can't verify the app. Press **Done**.
2. Open **System Settings → Privacy & Security** and scroll down to the message about archdraw.
3. Press **Open Anyway**, enter your password, then press **Open**.

**macOS 13 (Ventura) and 14 (Sonoma)**

1. In Applications, hold **Control** and click **archdraw** (or right-click it), then choose **Open**.
2. Press **Open** in the dialog.

**From the Terminal instead** (any version):

```sh
xattr -dr com.apple.quarantine /Applications/archdraw.app
```

This removes the "downloaded from the internet" flag from archdraw only; then open it normally.

## Updates

This build tells you when a new version is out and opens the download page; install it the same way. Builds
notarized by Apple, coming soon, update themselves.

## Why this step

Apple notarization needs a paid developer account, which archdraw is setting up. Until then, every build is made by
the [release workflow](../.github/workflows/release.yml) from the tagged source on GitHub, and each release lists its
SHA-256 checksums and a build provenance attestation you can check with `gh attestation verify <file> -R safiware/archdraw`.
