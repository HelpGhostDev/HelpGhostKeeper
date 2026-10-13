import { describe, expect, it, vi } from "vitest"
import type { KeyValueStorage } from "@keeper-security/secrets-manager-core"

const initializeStorage = vi.fn()
const getSecrets = vi.fn()

vi.mock("@keeper-security/secrets-manager-core", async () => {
  const actual = await vi.importActual<typeof import("@keeper-security/secrets-manager-core")>("@keeper-security/secrets-manager-core")
  return {
    ...actual,
    initializeStorage: (...args: unknown[]) => initializeStorage(...args),
    getSecrets: (...args: unknown[]) => getSecrets(...args),
  }
})

import { exchangeOneTimeToken } from "./exchange"

describe("exchangeOneTimeToken", () => {
  it("initializes storage from the token, binds with a first fetch, and returns the storage as base64 JSON", async () => {
    initializeStorage.mockImplementation(async (storage: KeyValueStorage, token: string) => {
      await storage.saveString("hostname", "keepersecurity.com")
      await storage.saveString("clientId", `cid-for-${token}`)
    })
    // The first getSecrets after initialization is what binds the device; the SDK writes appKey then.
    getSecrets.mockImplementation(async ({ storage }: { storage: KeyValueStorage }) => {
      await storage.saveString("appKey", "app-key-bytes")
      return { records: [], appData: { title: "HelpGhost", type: "app" } }
    })

    const config = await exchangeOneTimeToken("  US:abc123  ")

    expect(initializeStorage).toHaveBeenCalledWith(expect.anything(), "US:abc123", undefined)
    expect(getSecrets).toHaveBeenCalledTimes(1)
    const decoded = JSON.parse(Buffer.from(config, "base64").toString("utf8"))
    expect(decoded).toEqual({ hostname: "keepersecurity.com", clientId: "cid-for-US:abc123", appKey: "app-key-bytes" })
  })

  it("passes an explicit hostname through for region-less tokens", async () => {
    initializeStorage.mockResolvedValue(undefined)
    getSecrets.mockResolvedValue({ records: [], appData: { title: "x", type: "app" } })

    await exchangeOneTimeToken("bare-token", "keepersecurity.eu")

    expect(initializeStorage).toHaveBeenCalledWith(expect.anything(), "bare-token", "keepersecurity.eu")
  })

  it("surfaces an already-consumed or invalid token as the SDK's error", async () => {
    initializeStorage.mockRejectedValue(new Error("The storage is already initialized with a different client Id"))
    await expect(exchangeOneTimeToken("US:used")).rejects.toThrow(/already initialized/)
  })
})
