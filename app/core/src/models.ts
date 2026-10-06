// The user's LLM: which providers archdraw speaks to (with the user's own key), and the default models for chat and
// for the cheap "did the architecture change?" triage. Keys never touch disk here: a KeyStore hands them over per
// request (a self-hosted server reads providers.env from its config folder, see config.ts `secretsFile`; the desktop
// app uses the OS keychain).

import { readFileSync, statSync } from "node:fs"
import type { StreamFn } from "@earendil-works/pi-agent-core"
import { createModels, type Model, type Models } from "@earendil-works/pi-ai"
import { anthropicProvider } from "@earendil-works/pi-ai/providers/anthropic"
import { googleProvider } from "@earendil-works/pi-ai/providers/google"
import { openaiProvider } from "@earendil-works/pi-ai/providers/openai"
import { openrouterProvider } from "@earendil-works/pi-ai/providers/openrouter"

export const PROVIDERS = {
  openai: { name: "OpenAI", env: "OPENAI_API_KEY", chat: "gpt-5.6-terra", triage: "gpt-5.4-mini", prefix: "sk-", keyUrl: "https://platform.openai.com/api-keys" },
  anthropic: { name: "Anthropic", env: "ANTHROPIC_API_KEY", chat: "claude-sonnet-5-5", triage: "claude-haiku-4-5", prefix: "sk-ant-", keyUrl: "https://console.anthropic.com/settings/keys" },
  google: { name: "Google", env: "GEMINI_API_KEY", chat: "gemini-3.5-flash", triage: "gemini-3.5-flash-lite", prefix: "AIza", keyUrl: "https://aistudio.google.com/apikey" },
  openrouter: { name: "OpenRouter", env: "OPENROUTER_API_KEY", chat: "anthropic/claude-sonnet-5.5", triage: "openai/gpt-5.4-mini", prefix: "sk-or-", keyUrl: "https://openrouter.ai/keys" },
} as const

export type ProviderId = keyof typeof PROVIDERS

/** Which provider a pasted key belongs to, from its prefix (most specific first). */
export function providerOfKey(key: string): ProviderId | null {
  const k = key.trim()
  if (k.startsWith("sk-ant-")) return "anthropic"
  if (k.startsWith("sk-or-")) return "openrouter"
  if (k.startsWith("AIza")) return "google"
  if (k.startsWith("sk-")) return "openai"
  return null
}

export interface KeyStore {
  /** True when keys can only be kept with basic protection (a Linux desktop without a keyring). */
  readonly weak?: boolean
  get(provider: string): string | undefined
  set?(provider: string, key: string): void
  has(provider: string): boolean
}

/**
 * Keys from the environment, else from an owner-only KEY=value file (a self-hosted server's providers.env). The file is
 * refused when anyone but its owner can read it; keys are never logged or returned to the browser.
 */
export class EnvKeys implements KeyStore {
  constructor(private file?: string) {}
  get(provider: string): string | undefined {
    const name = PROVIDERS[provider as ProviderId]?.env
    if (!name) return undefined
    if (process.env[name]) return process.env[name]
    if (!this.file) return undefined
    try {
      const st = statSync(this.file)
      if (st.uid !== process.getuid?.() || (st.mode & 0o077) !== 0) return undefined
      for (const raw of readFileSync(this.file, "utf8").split("\n")) {
        const line = raw.trim().replace(/^export\s+/, "")
        const i = line.indexOf("=")
        if (i > 0 && line.slice(0, i) === name) return line.slice(i + 1).trim().replace(/^["']|["']$/g, "") || undefined
      }
    } catch {
      /* no file */
    }
    return undefined
  }
  has(provider: string) {
    return !!this.get(provider)
  }
}

/** Keys held in memory (tests, and the desktop app after it unlocks the keychain). */
export class MemoryKeys implements KeyStore {
  private keys = new Map<string, string>()
  get(p: string) {
    return this.keys.get(p)
  }
  set(p: string, k: string) {
    this.keys.set(p, k)
  }
  has(p: string) {
    return this.keys.has(p)
  }
}

export type ModelSet = ReturnType<typeof createModels>

let shared: ModelSet | null = null

/** One model collection with the four providers registered (the SDKs load lazily on first use). */
export function models(): ModelSet {
  if (!shared) {
    shared = createModels()
    for (const p of [openaiProvider(), anthropicProvider(), googleProvider(), openrouterProvider()]) shared.setProvider(p)
  }
  return shared
}

/** The chat or triage model for these settings, falling back to the provider's default. */
export function pickModel(m: Models, provider: string, id: string, role: "chat" | "triage"): Model<any> {
  const p = PROVIDERS[provider as ProviderId]
  const want = id || (p ? p[role] : "")
  const model = m.getModel(provider as any, want) ?? (p ? m.getModel(provider as any, p[role]) : undefined)
  if (!model) throw new Error(`no model ${want || "(none)"} for ${provider}; pick one in Settings`)
  return model
}

/**
 * How many times a model request is sent again after a dropped connection, a 408/409/429 or a 5xx: the OpenAI and
 * Anthropic SDKs' own default. pi-ai turns the SDKs' retries off and its own default is none, so without this a single
 * dropped connection ended the agent's turn with "Connection error.".
 */
export const MODEL_RETRIES = 2

// the APIs whose SDK takes a custom fetch (Google's adapter refuses one)
const FETCH_APIS = new Set(["openai-responses", "openai-completions", "anthropic-messages"])

/** Why a request's fetch failed, from its deepest cause: "other side closed, UND_ERR_SOCKET", "getaddrinfo ENOTFOUND …". */
export function transportCause(err: unknown): string {
  let e = err as { cause?: unknown; message?: string; code?: unknown; name?: string; errors?: { message?: string }[] } | undefined
  for (let i = 0; i < 6 && e?.cause; i++) e = e.cause as typeof e
  const parts = e instanceof AggregateError && e.errors?.length ? e.errors.map(x => x?.message) : [e?.message]
  const text = parts.filter(Boolean).join("; ") || String(e?.name ?? e)
  const code = typeof e?.code === "string" && !text.includes(e.code) ? `, ${e.code}` : ""
  return (text + code).slice(0, 200)
}

/**
 * The stream function for a pi Agent: transient failures are retried, and `onFailure` hears why a request's connection
 * failed (the SDKs keep that in the error's `cause`; pi-ai passes on only the message).
 */
export function streamWithRetries(m: Models, onFailure?: (why: string) => void): StreamFn {
  const fetchWithCause: typeof fetch = async (input, init) => {
    try {
      return await fetch(input, init)
    } catch (err) {
      if (!init?.signal?.aborted) onFailure?.(transportCause(err))
      throw err
    }
  }
  return (model, context, options) =>
    m.streamSimple(model, context, { ...options, maxRetries: MODEL_RETRIES, ...(onFailure && FETCH_APIS.has(model.api) ? { fetch: fetchWithCause } : {}) })
}

/** The SDKs' bare "Connection error." with the reason it happened, when one was heard. */
export function withCause(message: string, cause: string | null): string {
  return cause && /^Connection error\.?$/.test(message.trim()) ? `Connection error (${cause}).` : message
}
