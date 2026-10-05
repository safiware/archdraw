import { describe, expect, it } from "vitest"
import { models, PROVIDERS } from "../src/models.js"

describe("the default models", () => {
  it("every provider's chat and change-check defaults exist in the model registry", () => {
    const m = models() as unknown as { getModel(p: string, id: string): unknown }
    for (const [id, p] of Object.entries(PROVIDERS)) {
      expect(m.getModel(id, p.chat), `${id} chat ${p.chat}`).toBeTruthy()
      expect(m.getModel(id, p.triage), `${id} triage ${p.triage}`).toBeTruthy()
    }
  })
})
