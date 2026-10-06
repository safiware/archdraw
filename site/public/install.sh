#!/bin/sh
# Install archdraw: curl -fsSL https://archdraw.dev/install.sh | sh
#
# macOS 13+ (Apple Silicon or Intel): downloads the app for this chip from the latest GitHub release, checks it
# against the release's SHA256SUMS, and puts archdraw.app in /Applications (or ~/Applications if that is not
# writable). Linux x64: on Debian and Ubuntu, installs the .deb with apt (it asks for your password once); elsewhere,
# installs the AppImage in ~/.local/share/archdraw with an archdraw command and an entry in your app menu.
# Source: https://github.com/safiware/archdraw/blob/main/site/public/install.sh
#
# Settings (for testing; you need none of them):
#   ARCHDRAW_RELEASE_API   the release to install (default: the latest release's API URL)
#   ARCHDRAW_APPS_DIR      where the Mac app goes (default: /Applications, else ~/Applications)
#   ARCHDRAW_LINUX_FORMAT  deb or appimage (default: deb where apt exists, else appimage)
set -eu

REPO=safiware/archdraw
API=${ARCHDRAW_RELEASE_API:-https://api.github.com/repos/$REPO/releases/latest}

say() { printf '%s\n' "$*"; }
fail() { printf 'archdraw install: %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

have curl || fail "needs curl"
tmp=$(mktemp -d 2>/dev/null || mktemp -d -t archdraw)
trap 'rm -rf "$tmp"' EXIT
trap 'exit 130' INT TERM

say "Finding the latest archdraw release..."
curl -fsSL "$API" -o "$tmp/release.json" || fail "could not reach GitHub ($API)"
version=$(sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"v\{0,1\}\([^"]*\)".*/\1/p' "$tmp/release.json" | head -n 1)
[ -n "$version" ] || fail "no published release found"
# one asset URL per line
sed -n 's/.*"browser_download_url"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$tmp/release.json" > "$tmp/urls"

pick() { grep -E "$1" "$tmp/urls" | head -n 1 || true; }

sha256() {
  if have sha256sum; then sha256sum "$1" | cut -d ' ' -f 1
  else shasum -a 256 "$1" | cut -d ' ' -f 1
  fi
}

# download $1 to $tmp/$2 and check it against the release's SHA256SUMS
fetch() {
  url=$1 name=$2
  sums=$(pick '/SHA256SUMS$')
  [ -n "$sums" ] || fail "the release lists no SHA256SUMS to check the download against"
  curl -fsSL "$sums" -o "$tmp/SHA256SUMS" || fail "could not download SHA256SUMS"
  say "Downloading $name..."
  curl -fL --progress-bar "$url" -o "$tmp/$name" || fail "could not download $url"
  want=$(awk -v f="$name" '{ n = $2; sub(/^\*/, "", n); if (n == f) print $1 }' "$tmp/SHA256SUMS" | head -n 1)
  [ -n "$want" ] || fail "$name is not listed in SHA256SUMS"
  got=$(sha256 "$tmp/$name")
  [ "$got" = "$want" ] || fail "checksum mismatch for $name: expected $want, got $got"
  say "Checksum OK."
}

install_mac() {
  major=$(sw_vers -productVersion 2>/dev/null | cut -d . -f 1)
  [ "${major:-0}" -ge 13 ] || fail "archdraw needs macOS 13 or later"
  arch=$(uname -m)
  # a shell under Rosetta reports x86_64 on Apple Silicon; install the native app
  [ "$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)" = 1 ] && arch=arm64
  case $arch in
    arm64) url=$(pick '[-_]arm64\.zip$') ;;
    x86_64) url=$(pick '[-_](x64|x86_64)\.zip$') ;;
    *) fail "unsupported Mac architecture: $arch" ;;
  esac
  [ -n "$url" ] || fail "the release has no macOS build for $arch"
  name=$(basename "$url")
  fetch "$url" "$name"
  mkdir "$tmp/app"
  ditto -x -k "$tmp/$name" "$tmp/app"
  [ -d "$tmp/app/archdraw.app" ] || fail "the download did not contain archdraw.app"
  dest=${ARCHDRAW_APPS_DIR:-}
  if [ -z "$dest" ]; then
    if [ -w /Applications ]; then dest=/Applications; else dest=$HOME/Applications; fi
  fi
  mkdir -p "$dest"
  if pgrep -x archdraw >/dev/null 2>&1; then fail "archdraw is running; quit it and run this again"; fi
  rm -rf "$dest/archdraw.app"
  ditto "$tmp/app/archdraw.app" "$dest/archdraw.app"
  # a file fetched by curl carries no quarantine flag; clear it anyway so the app opens without a prompt
  xattr -dr com.apple.quarantine "$dest/archdraw.app" 2>/dev/null || true
  say ""
  say "archdraw $version is installed in $dest."
  say "Open it from $dest, or run:  open -a \"$dest/archdraw.app\""
  say "Then press \"Just try the sample\" for a two-minute tour; it needs no AI key."
}

install_linux() {
  [ "$(uname -m)" = x86_64 ] || fail "archdraw for Linux is built for x64 only, not $(uname -m)"
  format=${ARCHDRAW_LINUX_FORMAT:-}
  if [ -z "$format" ]; then
    if have apt-get && have dpkg; then format=deb; else format=appimage; fi
  fi
  case $format in
    deb)
      url=$(pick '\.deb$'); [ -n "$url" ] || fail "the release has no .deb"
      name=$(basename "$url")
      fetch "$url" "$name"
      chmod 644 "$tmp/$name"; chmod 755 "$tmp"   # apt reads it as its own user
      say "Installing with apt (it asks for your password)..."
      if [ "$(id -u)" = 0 ]; then apt-get install -y "$tmp/$name"
      elif have sudo; then sudo apt-get install -y "$tmp/$name"
      else fail "needs sudo to install $name; or run with ARCHDRAW_LINUX_FORMAT=appimage"
      fi
      say ""
      say "archdraw $version is installed. Start it from your app menu, or run:  archdraw"
      say "Then press \"Just try the sample\" for a two-minute tour; it needs no AI key."
      ;;
    appimage)
      url=$(pick '\.AppImage$'); [ -n "$url" ] || fail "the release has no AppImage"
      name=$(basename "$url")
      fetch "$url" "$name"
      data=${XDG_DATA_HOME:-$HOME/.local/share}
      bin=$HOME/.local/bin
      mkdir -p "$bin" "$data/archdraw" "$data/applications"
      install -m 755 "$tmp/$name" "$data/archdraw/archdraw.AppImage"
      # a launcher: the AppImage needs FUSE 2 (libfuse2), which many systems no longer ship; without it, it runs
      # extracted instead
      cat > "$bin/archdraw" <<LAUNCHER
#!/bin/sh
# archdraw, installed by https://archdraw.dev/install.sh
app="$data/archdraw/archdraw.AppImage"
for lib in /usr/lib/x86_64-linux-gnu/libfuse.so.2 /lib/x86_64-linux-gnu/libfuse.so.2 /usr/lib64/libfuse.so.2 /usr/lib/libfuse.so.2 /lib64/libfuse.so.2; do
  [ -e "\$lib" ] && exec "\$app" "\$@"
done
APPIMAGE_EXTRACT_AND_RUN=1 exec "\$app" "\$@"
LAUNCHER
      chmod 755 "$bin/archdraw"
      icon=$data/archdraw/archdraw.png
      curl -fsSL https://archdraw.dev/apple-touch-icon.png -o "$icon" 2>/dev/null || icon=
      cat > "$data/applications/archdraw.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=archdraw
Comment=Architecture diagrams that keep up with your code
Exec=$bin/archdraw %U
${icon:+Icon=$icon}
Terminal=false
Categories=Development;
DESKTOP
      say ""
      say "archdraw $version is installed, with an entry in your app menu."
      case ":$PATH:" in
        *":$bin:"*) say "Start it from your app menu, or run:  archdraw" ;;
        *) say "Start it from your app menu, or run:  $bin/archdraw  (add $bin to your PATH to type just: archdraw)" ;;
      esac
      say "Then press \"Just try the sample\" for a two-minute tour; it needs no AI key."
      ;;
    *) fail "ARCHDRAW_LINUX_FORMAT must be deb or appimage" ;;
  esac
}

case $(uname -s) in
  Darwin) install_mac ;;
  Linux) install_linux ;;
  *) fail "archdraw runs on macOS and Linux; Windows is not supported yet" ;;
esac
