// The agent over a real socket: a local stand-in for OpenAI's Responses API answers the first request with a tool call
// (as a real model does for "draw this project's system overview") and drops the connection of the second, the one
// that carries the tool result. A drop that happens once is retried; one that persists is reported with its cause.

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { Conversations } from "../src/agent.js"
import { Store } from "../src/config.js"
import { Library } from "../src/library.js"
import { MemoryKeys, models } from "../src/models.js"
import { Spend } from "../src/spend.js"

type Seen = { turn: number; dropped: boolean }

/** A Responses API stand-in. `drop(turn, attempt)` says whether to destroy the socket instead of answering. */
async function fakeOpenAI(drop: (turn: number, attempt: number) => boolean): Promise<{ base: string; seen: Seen[]; server: Server }> {
  const seen: Seen[] = []
  const attempts = new Map<number, number>()
  const server = createServer((req, res) => {
    let raw = ""
    req.on("data", c => (raw += c))
    req.on("end", () => {
      const body = JSON.parse(raw)
      const turn = (body.input as { type?: string }[]).some(i => i.type === "function_call_output") ? 2 : 1
      const attempt = (attempts.get(turn) ?? 0) + 1
      attempts.set(turn, attempt)
      const dropped = drop(turn, attempt)
      seen.push({ turn, dropped })
      if (dropped) return req.socket.destroy()
      const item =
        turn === 1
          ? { id: "fc_1", type: "function_call", call_id: "call_1", name: "read_skill", arguments: JSON.stringify({ path: "archdraw/SKILL.md" }), status: "completed" }
          : { id: "msg_2", type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: "Read it; drawing now.", annotations: [] }] }
      const events = [
        { type: "response.created", response: { id: `resp_${turn}`, status: "in_progress", output: [] } },
        { type: "response.output_item.added", output_index: 0, item: turn === 1 ? { ...item, arguments: "" } : { ...item, content: [] } },
        { type: "response.output_item.done", output_index: 0, item },
        { type: "response.completed", response: { id: `resp_${turn}`, status: "completed", output: [item], usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 } } },
      ]
      res.writeHead(200, { "content-type": "text/event-stream" })
      for (const [i, e] of events.entries()) res.write(`event: ${e.type}\ndata: ${JSON.stringify({ ...e, sequence_number: i })}\n\n`)
      res.end()
    })
  })
  await new Promise<void>(r => server.listen(0, "127.0.0.1", r))
  return { base: `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`, seen, server }
}

/** archdraw's own model set (the four real providers), with OpenAI's endpoint moved to the stand-in. */
function pointedAt(base: string) {
  const real = models()
  return new Proxy(real, {
    get(t, p) {
      if (p === "getModel") return (provider: string, id: string) => ({ ...t.getModel(provider as never, id), baseUrl: base })
      const v = Reflect.get(t, p)
      return typeof v === "function" ? v.bind(t) : v
    },
  })
}

function conversation(base: string) {
  const root = mkdtempSync(join(tmpdir(), "archdraw-net-"))
  const dir = join(root, "proj")
  mkdirSync(join(dir, "src"), { recursive: true })
  writeFileSync(join(dir, "src", "main.ts"), "export const app = 1\n")
  const store = new Store(join(root, "home"))
  store.update(c => {
    c.settings.provider = "openai"
  })
  const lib = new Library(store, null)
  lib.addFolder(dir, { slug: "proj" })
  const keys = new MemoryKeys()
  keys.set("openai", "sk-test-0000000000000000000000")
  return new Conversations({ store, lib, keys, models: pointedAt(base) as never, spend: new Spend(store) }).open("proj")
}

async function settle(c: { events: { type: string }[] }, ms = 15_000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (c.events.some(e => e.type === "settled")) return
    await new Promise(r => setTimeout(r, 20))
  }
  throw new Error(`not settled: ${c.events.map(e => e.type).join(",")}`)
}

const PROMPT = "Draw this project's system overview: read the code first, then propose the diagram and its explanation."
let server: Server | null = null
afterEach(() => {
  server?.close()
  server = null
})

describe("the agent's connection to the model", () => {
  it("sends a request again when its connection drops once, so the agent still answers", async () => {
    const fake = await fakeOpenAI((turn, attempt) => turn === 2 && attempt === 1)
    server = fake.server
    const c = conversation(fake.base)
    c.say(PROMPT)
    await settle(c)
    const errors = c.events.filter(e => e.type === "error")
    expect(errors).toEqual([])
    expect(c.events.find(e => e.type === "tool")).toMatchObject({ name: "read_skill" })
    expect(c.events.find(e => e.type === "assistant")).toMatchObject({ text: "Read it; drawing now." })
    expect(fake.seen).toEqual([
      { turn: 1, dropped: false },
      { turn: 2, dropped: true },
      { turn: 2, dropped: false },
    ])
  })

  it("says why a connection failed, not only that it did", async () => {
    const fake = await fakeOpenAI(turn => turn === 2)
    server = fake.server
    const c = conversation(fake.base)
    c.say(PROMPT)
    await settle(c)
    const error = c.events.find(e => e.type === "error") as { text: string } | undefined
    expect(error?.text).toMatch(/^Connection error \(other side closed, UND_ERR_SOCKET\)/)
    expect(fake.seen.filter(s => s.turn === 2).length).toBe(3) // the first try and two retries
  })
})
