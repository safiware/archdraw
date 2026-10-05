// archdraw for the desktop (macOS and Linux; Windows later). The window shows the same UI as a self-hosted server:
// this process runs the same server (server/src/main.ts `start`) on 127.0.0.1 with a per-launch token, and opens the
// window at /?token=<token> (the server turns it into an HttpOnly cookie). Keys are encrypted with the OS keychain
// (safeStorage); the app's state lives in userData; the hourly sync keeps running from the tray when the window closes.

import { randomBytes } from "node:crypto"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, session, shell, Tray } from "electron"
import updater from "electron-updater"
import { start } from "../../server/src/main.js"
import { SafeKeys } from "./keys.js"

const dev = !app.isPackaged
const res = (p: string) => (dev ? join(import.meta.dirname, "..", "..", p) : join(process.resourcesPath, p))

// a GUI app on macOS starts with a bare PATH; git and gh usually live in Homebrew's or /usr/local's bin
if (process.platform === "darwin") process.env.PATH = ["/opt/homebrew/bin", "/usr/local/bin", process.env.PATH].filter(Boolean).join(":")
process.env.ARCHDRAW_ASSETS = dev ? res("core/assets") : res("assets")

let win: BrowserWindow | null = null
let tray: Tray | null = null
let server: Awaited<ReturnType<typeof start>> | null = null
let quitting = false
const token = randomBytes(24).toString("hex")

// a second launch hands over to the running app (it shows its window) and stops before starting a server of its own
const firstInstance = app.requestSingleInstanceLock()
if (!firstInstance) app.exit(0)
app.on("second-instance", () => show())

function icon(): Electron.NativeImage {
  const file = dev ? res("desktop/icon.png") : res("icon.png")
  return existsSync(file) ? nativeImage.createFromPath(file) : nativeImage.createEmpty()
}

function show() {
  if (!win || win.isDestroyed()) return createWindow()
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 860,
    minHeight: 560,
    title: "archdraw",
    icon: icon(),
    backgroundColor: "#f6f7f9",
    show: false,
    webPreferences: { preload: join(import.meta.dirname, "preload.cjs"), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
  })
  win.once("ready-to-show", () => win?.show())
  // the window shows only the app: links elsewhere open in the browser, navigation away is refused. Origins are
  // compared, never string prefixes (`http://127.0.0.1:5000@evil.com` starts with the app's URL)
  const own = new URL(server!.url).origin
  const ours = (url: string) => {
    try {
      return new URL(url).origin === own
    } catch {
      return false
    }
  }
  const outside = (url: string) => /^https?:\/\//i.test(url) && !ours(url)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (outside(url)) void shell.openExternal(url)
    return { action: "deny" }
  })
  const guard = (e: Electron.Event, url: string) => {
    if (ours(url)) return
    e.preventDefault()
    if (outside(url)) void shell.openExternal(url)
  }
  win.webContents.on("will-navigate", guard)
  win.webContents.on("will-redirect", guard)
  // closing the window keeps archdraw in the tray (Linux) or the dock (macOS), so the hourly check goes on
  win.on("close", e => {
    if (!quitting && (tray || process.platform === "darwin")) {
      e.preventDefault()
      win?.hide()
    }
  })
  void win.loadURL(`${server!.url}/?token=${token}`)
}

function menu() {
  const tour = () => win?.webContents.executeJavaScript(`window.dispatchEvent(new Event("archdraw:tour"))`)
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(process.platform === "darwin" ? [{ role: "appMenu" as const }] : []),
      { role: "fileMenu" },
      { role: "editMenu" },
      { role: "viewMenu" },
      { role: "windowMenu" },
      {
        role: "help",
        submenu: [
          { label: "Show me around", click: () => (show(), void tour()) },
          { label: "Check for updates", click: () => void checkForUpdates(true) },
          { label: "Report a problem", click: () => void shell.openExternal(issueUrl()) },
          { label: "Open the data folder", click: () => void shell.openPath(app.getPath("userData")) },
        ],
      },
    ]),
  )
}

function makeTray() {
  if (process.platform === "darwin") return // the dock icon is the way back on macOS
  try {
    tray = new Tray(icon().resize({ width: 22, height: 22 }))
    tray.setToolTip("archdraw")
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: "Open archdraw", click: () => show() },
        { type: "separator" },
        { label: "Quit", click: () => ((quitting = true), app.quit()) },
      ]),
    )
    tray.on("click", () => show())
  } catch {
    tray = null // no tray on this desktop: closing the window quits
  }
}

ipcMain.handle("archdraw:pick-folder", async () => {
  const r = await dialog.showOpenDialog(win!, { properties: ["openDirectory"], title: "Choose a project folder" })
  return r.canceled ? null : r.filePaths[0]
})

const RELEASES = "https://github.com/safiware/archdraw/releases"

/** A new GitHub issue with the facts a bug report needs already filled in. */
function issueUrl(): string {
  const body = `**What happened**\n\n\n**What you expected**\n\n\n---\narchdraw ${app.getVersion()} · ${process.platform} ${process.arch} · Electron ${process.versions.electron}`
  return `https://github.com/safiware/archdraw/issues/new?body=${encodeURIComponent(body)}`
}

/** Updates come from GitHub Releases. The AppImage and the Mac app update themselves; a deb is installed by the
 *  system's package tools, so its users are told and sent to the download page instead. */
async function checkForUpdates(byHand = false): Promise<void> {
  if (dev || process.env.ARCHDRAW_NO_UPDATE) return
  const { autoUpdater } = updater
  const selfUpdating = process.platform === "darwin" || !!process.env.APPIMAGE
  autoUpdater.autoDownload = selfUpdating
  try {
    const r = await autoUpdater.checkForUpdates()
    const next = r?.updateInfo?.version
    const newer = !!r?.isUpdateAvailable && !!next // the updater compares versions itself: never a downgrade
    if (newer && !selfUpdating) {
      const pick = await dialog.showMessageBox({ type: "info", message: `archdraw ${next} is available`, detail: "Download the new .deb from the releases page and install it.", buttons: ["Open the releases page", "Later"] })
      if (pick.response === 0) void shell.openExternal(RELEASES)
    } else if (newer && updateReady !== next) {
      autoUpdater.once("update-downloaded", () => {
        if (updateReady === next) return
        updateReady = next
        void dialog.showMessageBox({ type: "info", message: `archdraw ${next} is ready`, detail: "It installs when you quit archdraw.", buttons: ["OK"] })
      })
    } else if (byHand) {
      void dialog.showMessageBox({ type: "info", message: "archdraw is up to date", detail: `You have ${app.getVersion()}.`, buttons: ["OK"] })
    }
  } catch (e) {
    if (byHand) void dialog.showMessageBox({ type: "warning", message: "Could not check for updates", detail: String((e as Error).message ?? e).slice(0, 300), buttons: ["OK"] })
  }
}

let updateReady: string | null = null // the version downloaded and waiting for a quit, announced once

app.whenReady().then(async () => {
  if (!firstInstance) return
  // the app needs no camera, microphone, location or notifications from the page
  // except writing to the clipboard ("Copy link")
  const allowed = (perm: string) => perm === "clipboard-sanitized-write"
  session.defaultSession.setPermissionRequestHandler((_wc, perm, done) => done(allowed(perm)))
  session.defaultSession.setPermissionCheckHandler((_wc, perm) => allowed(perm))
  const keys = new SafeKeys(join(app.getPath("userData"), "keys.json"))
  server = await start({
    home: app.getPath("userData"),
    host: "127.0.0.1",
    port: 0,
    gate: { mode: "token", token },
    keys,
    ui: dev ? res("ui/dist") : res("ui"),
    sync: true,
    by: "archdraw",
    log: s => dev && console.log(s),
  })
  // CI's launch check: the packaged app starts its server, serves its own page, and quits
  if (process.env.ARCHDRAW_SMOKE) {
    const s = server!
    const health = await fetch(`${s.url}/api/health?token=${token}`).then(r => r.json()).catch(e => ({ error: String(e) }))
    const page = await fetch(`${s.url}/`, { headers: { cookie: `archdraw=${token}` } }).then(r => r.text()).catch(() => "")
    const ok = (health as { ok?: boolean }).ok === true && page.includes("<div id=\"root\"")
    console.log(`archdraw smoke ${ok ? "ok" : "FAILED"} ${app.getVersion()} ${JSON.stringify(health)}`)
    await s.close()
    app.exit(ok ? 0 : 1)
    return
  }
  menu()
  makeTray()
  createWindow()
  void checkForUpdates()
  setInterval(() => void checkForUpdates(), 6 * 60 * 60 * 1000).unref()
  if (keys.weak) void dialog.showMessageBox({ type: "warning", message: "No system keychain found", detail: "Your AI key will be stored on this machine with only basic protection. Install a keyring (GNOME Keyring or KWallet) for encrypted storage." })
})

app.on("activate", () => show())
app.on("before-quit", () => {
  quitting = true
})
app.on("will-quit", e => {
  if (server) {
    e.preventDefault()
    const s = server
    server = null
    void s.close().finally(() => app.exit(0))
  }
})
app.on("window-all-closed", () => {
  if (!tray && process.platform !== "darwin") app.quit()
})
