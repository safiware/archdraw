// Whether this Mac app carries a Developer ID signature. macOS installs an update in place only for an app signed
// that way; an ad hoc signed build (how archdraw ships until its Apple Developer ID is in place) cannot replace
// itself, so its users are told about a new version and sent to the download page instead.
import { spawnSync } from "node:child_process"
import { join } from "node:path"

/** Reads `codesign -dv --verbose=2` output (it writes to stderr). */
export function developerIdSigned(codesignOutput: string): boolean {
  return /^Authority=Developer ID Application: /m.test(codesignOutput)
}

/** The .app bundle around this executable (archdraw.app/Contents/MacOS/archdraw), checked with the system's codesign. */
export function thisMacAppIsDeveloperIdSigned(execPath = process.execPath): boolean {
  const bundle = join(execPath, "..", "..", "..")
  const r = spawnSync("/usr/bin/codesign", ["-dv", "--verbose=2", bundle], { encoding: "utf8", timeout: 5000 })
  return developerIdSigned(r.stderr ?? "")
}
