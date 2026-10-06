import { describe, expect, it } from "vitest"
import { check } from "../src/engine.js"

// check() is what a refused save, the scheduled drafts and Arch Agent's check_diagram report; the app's editor shows the
// same words (ui/src/render.ts `refusal`), so a line number reads the same everywhere (#32)
describe("check", () => {
  it("is null when the source renders", () => {
    expect(check('node a "A"\nnode b "B" right of a')).toBeNull()
  })
  it("names the line of the mistake", () => {
    expect(check('node a "A"\nnode b "B" rigth of a')).toBe('line 2: node "b": "rigth" is not a direction')
  })
  it("names the line at fault in a statement written over several lines", () => {
    expect(check('node a "A"\nnode b "B"\n  style: rounded\n  rigth of a')).toBe('line 4: node "b": "rigth" is not a direction')
  })
})
