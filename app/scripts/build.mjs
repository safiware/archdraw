// Build archdraw: the headless server (dist/, for self-hosting) and the desktop app (desktop/app/, for electron-builder).
//
//   node scripts/build.mjs            both
//   node scripts/build.mjs server     dist/server.mjs + dist/ui + dist/assets
//   node scripts/build.mjs desktop    desktop/app/{main.mjs,preload.cjs,package.json}
//
// The UI is built by its own package (ui/: `npx vite build`); this copies ui/dist next to each bundle.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { build } from "esbuild"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
const what = process.argv[2] ?? "all"
// bundled ESM still needs `require` for the few CommonJS dependencies
const banner = { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" }

/** The packages an esbuild bundle took code from (its metafile's inputs), plus the UI's own runtime dependencies. */
function packagesOf(metafile) {
  const out = new Map()
  for (const input of Object.keys(metafile.inputs)) {
    const m = /(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)\//.exec(input.split("node_modules/").length > 1 ? input.slice(0, input.lastIndexOf("node_modules/")) + input.slice(input.lastIndexOf("node_modules/")) : input)
    if (!m) continue
    const dir = join(root, input.slice(0, input.lastIndexOf("node_modules/")) + "node_modules", m[1])
    out.set(m[1], dir)
  }
  return out
}
function uiPackages() {
  const out = new Map()
  const seen = new Set()
  const walk = name => {
    if (seen.has(name)) return
    seen.add(name)
    const dir = join(root, "ui/node_modules", name)
    if (!existsSync(join(dir, "package.json"))) return
    out.set(name, dir)
    for (const dep of Object.keys(JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).dependencies ?? {})) walk(dep)
  }
  for (const dep of Object.keys(JSON.parse(readFileSync(join(root, "ui/package.json"), "utf8")).dependencies ?? {})) walk(dep)
  return out
}
/** THIRD_PARTY_NOTICES.txt: every bundled package's name, version, license and license text (Apache-2.0 §4). */
function notices(pkgs) {
  const parts = ["archdraw includes the following third-party software. Each is used under the license shown.\n"]
  for (const [name, dir] of [...pkgs].sort((a, b) => a[0].localeCompare(b[0]))) {
    let meta = {}
    try {
      meta = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"))
    } catch {
      continue
    }
    const file = existsSync(dir) ? readdirSync(dir).find(f => /^(licen[cs]e|copying)(\.|$)/i.test(f)) : undefined
    const text = file ? readFileSync(join(dir, file), "utf8").trim() : `(no license file shipped; package.json says ${meta.license ?? "unknown"})`
    parts.push(`----------------------------------------------------------------------\n${name} ${meta.version ?? ""}\nLicense: ${typeof meta.license === "string" ? meta.license : JSON.stringify(meta.license ?? "unknown")}\n\n${text}\n`)
  }
  return parts.join("\n")
}

if (what === "all" || what === "server") {
  const out = join(root, "dist")
  rmSync(out, { recursive: true, force: true })
  const r = await build({ entryPoints: { server: join(root, "server/src/main.ts") }, outdir: out, bundle: true, platform: "node", format: "esm", target: "node22", splitting: true, outExtension: { ".js": ".mjs" }, sourcemap: true, banner, logLevel: "warning", metafile: true })
  writeFileSync(join(out, "THIRD_PARTY_NOTICES.txt"), notices(new Map([...packagesOf(r.metafile), ...uiPackages()])))
  cpSync(join(root, "ui/dist"), join(out, "ui"), { recursive: true })
  cpSync(join(root, "core/assets"), join(out, "assets"), { recursive: true })
  console.log("built dist/server.mjs")
}

if (what === "all" || what === "desktop") {
  const out = join(root, "desktop/app")
  rmSync(out, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })
  const r = await build({ entryPoints: { main: join(root, "desktop/src/main.ts") }, outdir: out, bundle: true, platform: "node", format: "esm", target: "node22", splitting: true, outExtension: { ".js": ".mjs" }, external: ["electron"], banner, logLevel: "warning", metafile: true })
  writeFileSync(join(out, "THIRD_PARTY_NOTICES.txt"), notices(new Map([...packagesOf(r.metafile), ...uiPackages()])))
  await build({ entryPoints: [join(root, "desktop/src/preload.ts")], outfile: join(out, "preload.cjs"), bundle: true, platform: "node", format: "cjs", external: ["electron"], logLevel: "warning" })
  writeFileSync(join(out, "package.json"), JSON.stringify({ name: "archdraw", productName: "archdraw", version: pkg.version, description: pkg.description, main: "main.mjs", type: "module", author: { name: "Safiware", email: "hello@archdraw.dev" }, homepage: "https://archdraw.dev", desktopName: "archdraw.desktop", license: "FSL-1.1-ALv2" }, null, 1))
  console.log("built desktop/app")
}
