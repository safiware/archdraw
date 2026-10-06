// A Mac build updates itself only with a Developer ID signature; an ad hoc one is sent to the download page.

import { describe, expect, it } from "vitest"
import { developerIdSigned } from "../src/signing.js"

describe("Mac signing", () => {
  it("recognises a Developer ID signature", () => {
    const out = "Executable=/Applications/archdraw.app/Contents/MacOS/archdraw\nIdentifier=dev.archdraw.app\nAuthority=Developer ID Application: Tawab Safi (ABCDE12345)\nAuthority=Developer ID Certification Authority\nAuthority=Apple Root CA\nTeamIdentifier=ABCDE12345\n"
    expect(developerIdSigned(out)).toBe(true)
  })

  it("treats an ad hoc signature, an unsigned app or no codesign output as not self-updating", () => {
    expect(developerIdSigned("Executable=/Applications/archdraw.app/Contents/MacOS/archdraw\nSignature=adhoc\nTeamIdentifier=not set\n")).toBe(false)
    expect(developerIdSigned("/Applications/archdraw.app: code object is not signed at all\n")).toBe(false)
    expect(developerIdSigned("")).toBe(false)
    expect(developerIdSigned("Authority=Apple Development: someone (X)\n")).toBe(false)
  })
})
