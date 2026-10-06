// The diagram engine, in process. `compile` is given no icon-file reader, so a file icon in any spelling is refused
// by the engine itself rather than read from disk: a diagram can never make the app read
// a file. Diagrams are capped at 200 KB and the engine refuses ambiguity instead of searching, so a check is fast
// (0.1–0.4 s for large diagrams).

import { compile, parse, resolve, SourceError, THEMES } from "../../../engine/src/index.js"

export { parse, resolve }

/** The engine's error for this source ("line N: …"), or null when it renders. */
export function check(source: string): string | null {
  try {
    compile(source)
    return null
  } catch (e) {
    // the engine's own "line N: …" (SourceError.format), as the app's editor shows it (ui/src/render.ts `refusal`)
    return (e instanceof SourceError && e.line > 0 ? e.format() : String(e instanceof Error ? e.message : e)).slice(0, 2000)
  }
}

/** The SVG for a source, light or dark (export and server-side previews). Throws the engine's error. */
export function svg(source: string, dark = false): string {
  return compile(source, { theme: dark ? THEMES.dark : THEMES.light })
}
