// What this machine needs for archdraw, checked on first run and shown in plain words: git (to read and write repos)
// and the GitHub CLI signed in (to open and merge pull requests). Nothing here changes the machine.

import { spawn } from "node:child_process"

export type Doctor = {
  git: string | null // git's version, or null when git is not installed
  gh: { installed: boolean; signedIn: boolean; user: string | null }
}

function run(cmd: string, args: string[], timeoutMs = 8000): Promise<{ code: number | null; out: string }> {
  return new Promise(resolve => {
    let out = ""
    let child
    try {
      child = spawn(cmd, args, { env: { ...process.env, GH_PROMPT_DISABLED: "1", NO_COLOR: "1" }, stdio: ["ignore", "pipe", "pipe"] })
    } catch {
      return resolve({ code: null, out: "" })
    }
    const t = setTimeout(() => child.kill("SIGTERM"), timeoutMs)
    child.stdout.setEncoding("utf8").on("data", d => (out += d))
    child.stderr.setEncoding("utf8").on("data", d => (out += d))
    child.on("error", () => (clearTimeout(t), resolve({ code: null, out: "" })))
    child.on("close", code => (clearTimeout(t), resolve({ code, out })))
  })
}

export async function doctor(): Promise<Doctor> {
  const [g, h] = await Promise.all([run("git", ["--version"]), run("gh", ["auth", "status", "--hostname", "github.com"])])
  const git = g.code === 0 ? (/git version (\S+)/.exec(g.out)?.[1] ?? "installed") : null
  const installed = h.code !== null
  const signedIn = h.code === 0
  const user = signedIn ? (/account (\S+)/.exec(h.out)?.[1] ?? /as (\S+)/.exec(h.out)?.[1] ?? null) : null
  return { git, gh: { installed, signedIn, user } }
}

/** Whether this machine's GitHub login may push to `repo` (owner/name); null when that cannot be told (no gh). */
export async function canPush(repo: string): Promise<boolean | null> {
  const r = await run("gh", ["api", `repos/${repo}`, "--jq", ".permissions.push"])
  if (r.code !== 0) return null
  return r.out.trim() === "true"
}
