// The tailnet gate:
// forged Tailscale headers from off the box are refused, only the last X-Forwarded-For hop counts, an agent node is
// refused, a loopback socket's owner is read from /proc/net/tcp, and the local gate never admits a request that came
// through Serve.

import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { decide, forwardedClient, isVerified, peerUid, sameOrigin, verifiedSender } from "../src/identity.js"

// the owner and a build box that runs agents, as a self-hosted server would configure them
const PRINCIPAL = "owner@example.com"
process.env.ARCHDRAW_PRINCIPAL = PRINCIPAL
process.env.ARCHDRAW_DENY_NODES = "build-box"

const H = (m: Record<string, string>) => ({ get: (n: string) => m[n.toLowerCase()] })

describe("the tailnet gate", () => {
  it("verifies only the owner, through Serve, from a machine that is not denied", () => {
    expect(isVerified(PRINCIPAL, "owner-laptop", true)).toBe(true)
    expect(isVerified(PRINCIPAL, "owner-laptop", false)).toBe(false)
    expect(isVerified(PRINCIPAL, "build-box", true)).toBe(false)
    expect(isVerified("someone@else.com", "owner-laptop", true)).toBe(false)
    expect(isVerified(PRINCIPAL, "", true)).toBe(false)
  })

  it("believes only the last X-Forwarded-For hop (the one Serve appended)", () => {
    expect(forwardedClient("1.2.3.4, 100.64.0.7", "127.0.0.1")).toBe("100.64.0.7")
    expect(forwardedClient("", "127.0.0.1")).toBe("127.0.0.1")
  })

  it("reads the owner of an established loopback socket, matching both ends", () => {
    const dir = mkdtempSync(join(tmpdir(), "archdraw-tcp-"))
    const table = join(dir, "tcp")
    const row = (local: string, remote: string, st: string, uid: number) => `   0: ${local} ${remote} ${st} 00000000:00000000 00:00000000 00000000  ${uid}        0 1 1 0 20 4 30 10 -1`
    writeFileSync(table, ["  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode", row("0100007F:D431", "0100007F:1F98", "01", 0), row("0100007F:D432", "0100007F:1F98", "06", 0), row("0100007F:D433", "0100007F:1F99", "01", 1003)].join("\n"))
    expect(peerUid(0xd431, 8088, table)).toBe(0) // tailscaled
    expect(peerUid(0xd432, 8088, table)).toBeNull() // TIME_WAIT does not count
    expect(peerUid(0xd433, 8088, table)).toBeNull() // same local port, another destination
    expect(peerUid(0xd433, 8089, table)).toBe(1003)
  })

  it("refuses forged Tailscale headers from a peer that is not this box's loopback", async () => {
    const forged = H({ "tailscale-user-login": PRINCIPAL, "x-forwarded-host": "box.tail.ts.net", "x-forwarded-for": "100.64.0.7" })
    const v = await verifiedSender(forged, { address: "10.1.2.3", port: 5555, serverPort: 8088 }, async () => "owner-laptop")
    expect(v).toMatchObject({ ok: false, reason: "not via Serve" })
    const d = await decide({ mode: "tailnet", allowLocal: true }, "/api/projects", forged, { address: "10.1.2.3", port: 5555, serverPort: 8088 }, undefined, null)
    expect(d.ok).toBe(false)
  })

  it("the local gate admits nothing that carries Serve's headers, nor a stranger", async () => {
    const viaServe = H({ "x-forwarded-host": "box.tail.ts.net", "tailscale-user-login": "anyone@x.com" })
    expect((await decide({ mode: "local" }, "/api/projects", viaServe, { address: "127.0.0.1", port: 1, serverPort: 2 }, undefined, null)).ok).toBe(false)
    expect((await decide({ mode: "local" }, "/api/projects", H({}), { address: "10.0.0.9", port: 1, serverPort: 2 }, undefined, null)).ok).toBe(false)
  })

  it("the token gate wants the loopback host and the session", async () => {
    const gate = { mode: "token" as const, token: "t" }
    const peer = { address: "127.0.0.1", port: 1, serverPort: 2 }
    expect((await decide(gate, "/", H({ host: "127.0.0.1:9" }), peer, "t", null)).ok).toBe(true)
    expect((await decide(gate, "/", H({ host: "evil.example" }), peer, "t", null)).ok).toBe(false)
    expect((await decide(gate, "/", H({ host: "127.0.0.1:9" }), peer, "wrong", null)).ok).toBe(false)
  })

  it("a write must come from the page's own origin", () => {
    expect(sameOrigin(H({ host: "box.tail.ts.net:8445", origin: "https://box.tail.ts.net:8445" }))).toBe(true)
    expect(sameOrigin(H({ "x-forwarded-host": "box.tail.ts.net:8445", host: "127.0.0.1:8088", origin: "https://box.tail.ts.net:8445" }))).toBe(true)
    expect(sameOrigin(H({ host: "box.tail.ts.net:8445", origin: "https://evil.example" }))).toBe(false)
    expect(sameOrigin(H({ host: "a:1", referer: "https://b:2/x" }))).toBe(false)
    expect(sameOrigin(H({ host: "a:1" }))).toBe(true) // curl from this box: neither header
  })
})
