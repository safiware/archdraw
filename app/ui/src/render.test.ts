// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import * as engine from "@engine"
import { renderSource, sanitize } from "./render"

describe("renderSource errors", () => {
  it("includes the source line when a diagram fails to compile", () => {
    const result = renderSource('node a "A"\nnode b "B" rigth of a', false)
    expect(result.error).toBe('line 2: node "b": "rigth" is not a direction')
    expect(result.size).toEqual({ w: 560, h: 120 })
  })
  it.each([undefined, 0])("keeps errors without a usable line unchanged (%s)", line => {
    const compile = vi.spyOn(engine, "compile").mockImplementationOnce(() => {
      throw Object.assign(new Error("cannot compile diagram"), { line })
    })
    try {
      expect(renderSource("", false).error).toBe("cannot compile diagram")
    } finally {
      compile.mockRestore()
    }
  })
})

describe("sanitize", () => {
  it("drops the three bypasses the review reproduced", () => {
    const img = sanitize('<svg xmlns="http://www.w3.org/2000/svg"><g><img src="x"/onerror="alert(1)"></g></svg>')
    expect(img).not.toMatch(/onerror|<img/i)
    const a = sanitize('<svg xmlns="http://www.w3.org/2000/svg"><a\nhref="javascript:alert(1)"><rect width="9" height="9"/></a></svg>')
    expect(a).not.toMatch(/javascript:/i)
    const style = sanitize('<svg xmlns="http://www.w3.org/2000/svg"><style>*{outline:9px solid red}</style><rect width="9" height="9"/></svg>')
    expect(style).not.toMatch(/<style|outline/i)
  })
  it("keeps studio links, anchors and web links, and drops other schemes", () => {
    const out = sanitize(
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="#/shop/pipeline"><rect/></a><a href="https://example.com/x"><rect/></a><a href="data:text/html,x"><rect/></a></svg>',
    )
    expect(out).toContain('href="#/shop/pipeline"')
    expect(out).toContain('class="ad-link"')
    expect(out).toContain('href="https://example.com/x"')
    expect(out).toContain('rel="noopener noreferrer"')
    expect(out).not.toContain("data:text/html")
  })
  it("a real engine render survives intact: markers and their url(#id) references", () => {
    const r = renderSource('node a "A"\nnode b "B" right of a  url: "#/x/y"\nedge a -> b', false)
    expect(r.error).toBeUndefined()
    expect(r.svg).toContain("<marker")
    expect(r.svg).toMatch(/marker-end="url\(#/)
    expect(r.svg).toContain('href="#/x/y"')
  })
})
