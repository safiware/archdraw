# Releasing archdraw

Releases are built by `.github/workflows/release.yml` when a tag `v<version>` is pushed. The workflow builds and
checks every package, then creates a **draft** GitHub release; a maintainer reads the draft and presses Publish.

## Once: the `release` environment

In the repo's Settings › Environments, create `release`, add a required reviewer, and add these secrets.

| Secret | What it holds | How to make it |
|---|---|---|
| `MAC_CERT_P12_BASE64` | The Developer ID Application certificate and its key, base64 | In Xcode or developer.apple.com, create a *Developer ID Application* certificate; export it from Keychain Access as a `.p12` with a password; then `base64 -i cert.p12 \| pbcopy` |
| `MAC_CERT_PASSWORD` | The `.p12`'s password | The password you chose when exporting |
| `APPLE_API_KEY_P8` | An App Store Connect API key, base64 of the whole `.p8` file | App Store Connect › Users and Access › Integrations › Team Keys: create a key with the Developer role, download `AuthKey_XXXX.p8` (once only), then `base64 -i AuthKey_XXXX.p8 \| pbcopy` |
| `APPLE_API_KEY_ID` | The key's ID | Shown beside the key (10 characters) |
| `APPLE_API_ISSUER` | The issuer ID | Shown above the keys list (a UUID) |

Until these secrets are set, the Mac build is signed ad hoc (not notarized): the release still builds, and its notes tell Mac users how to open and update it. With them, the Mac build is signed and notarized and updates itself.

## Each release

1. Update `CHANGELOG.md` and set `"version"` in `app/package.json` (for example `0.1.1`), in a pull request.
2. After it merges: `git tag v0.1.1 && git push origin v0.1.1`.
3. Approve the `release` environment when the workflow asks.
4. Open the draft release, check the notes and the files (dmg and zip for arm64 and x64, AppImage, deb, `latest*.yml`, `SHA256SUMS`), and press **Publish**. Installed apps find it within six hours.

Users can verify a download with `sha256sum -c SHA256SUMS` or `gh attestation verify <file> --repo safiware/archdraw`.
