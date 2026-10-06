// The settings a self-hosted server starts with: a value it cannot use is refused with a message, never guessed.

import { describe, expect, it } from "vitest"
import { serverSettings } from "../src/main.js"

describe("server settings", () => {
  it("defaults to the tailnet gate on 8088", () => {
    expect(serverSettings({})).toEqual({ mode: "tailnet", port: 8088 })
  })

  it("treats an empty value as unset, and ignores spaces around one", () => {
    expect(serverSettings({ ARCHDRAW_GATE: "", ARCHDRAW_PORT: "" })).toEqual({ mode: "tailnet", port: 8088 })
    expect(serverSettings({ ARCHDRAW_GATE: " token ", ARCHDRAW_PORT: " 9000 " })).toEqual({ mode: "token", port: 9000 })
  })

  it("takes each gate mode and a port", () => {
    expect(serverSettings({ ARCHDRAW_GATE: "token", ARCHDRAW_PORT: "9000" })).toEqual({ mode: "token", port: 9000 })
    expect(serverSettings({ ARCHDRAW_GATE: "local" })).toEqual({ mode: "local", port: 8088 })
  })

  it("refuses a mistyped gate instead of starting a server that refuses everyone", () => {
    expect(serverSettings({ ARCHDRAW_GATE: "tokn" })).toEqual({ error: 'ARCHDRAW_GATE is "tokn": use tailnet, token or local' })
  })

  it("refuses a port that is not a number from 1 to 65535", () => {
    for (const p of ["abc", "0", "70000", "80.5", "-1", "1e3"]) expect(serverSettings({ ARCHDRAW_PORT: p })).toHaveProperty("error")
  })
})
