import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { KeeperFolder, KeeperRecord } from "@keeper-security/secrets-manager-core"

const getSecrets = vi.fn()
const getFolders = vi.fn()

vi.mock("@keeper-security/secrets-manager-core", async () => {
  const actual = await vi.importActual<typeof import("@keeper-security/secrets-manager-core")>("@keeper-security/secrets-manager-core")
  return {
    ...actual,
    getSecrets: (...args: unknown[]) => getSecrets(...args),
    getFolders: (...args: unknown[]) => getFolders(...args),
  }
})

import { createKeeperLookup } from "./lookup"

// A real device config is base64 JSON of the SDK's storage keys. Only `hostname` is read by us.
const configFor = (hostname: string) => Buffer.from(JSON.stringify({ hostname, clientId: "cid" })).toString("base64")

const PASSWORD = "pw-hunter2-7Qp"
const NOTES = "notes-do-not-index-me"

const records: KeeperRecord[] = [
  {
    recordUid: "r-dc01",
    folderUid: "f-contoso",
    revision: 1,
    data: {
      title: "Contoso – DC01 local admin",
      type: "login",
      fields: [
        { type: "login", value: ["contoso\\admin"] },
        { type: "password", value: [PASSWORD] },
        { type: "url", value: ["https://dc01.contoso.local"] },
      ],
      notes: NOTES,
    },
  },
  {
    recordUid: "r-fw",
    folderUid: "f-fabrikam",
    revision: 1,
    data: {
      title: "Fabrikam firewall",
      type: "login",
      fields: [
        { type: "password", value: ["other-pw"] },
        { type: "url", value: ["https://fw.fabrikam.example"] },
      ],
      notes: "mentions dc01 in the notes only",
    },
  },
]

const folders: KeeperFolder[] = [
  { folderUid: "f-contoso", name: "Contoso" },
  { folderUid: "f-fabrikam", name: "Fabrikam" },
  { folderUid: "f-sub", name: "Servers", parentUid: "f-contoso" },
]

describe("createKeeperLookup", () => {
  const consoleSpies = [
    vi.spyOn(console, "log"),
    vi.spyOn(console, "info"),
    vi.spyOn(console, "warn"),
    vi.spyOn(console, "error"),
    vi.spyOn(console, "debug"),
  ]

  beforeEach(() => {
    getSecrets.mockResolvedValue({ records, appData: { title: "HelpGhost", type: "app" } })
    getFolders.mockResolvedValue(folders)
  })

  afterEach(() => {
    for (const spy of consoleSpies) spy.mockClear()
  })

  it("search matches title case-insensitively and returns summaries only", async () => {
    const lookup = createKeeperLookup(configFor("keepersecurity.com"))
    const results = await lookup.search("dc01")
    expect(results.map((r) => r.recordUid)).toEqual(["r-dc01"])
    expect(JSON.stringify(results)).not.toContain(PASSWORD)
    expect(JSON.stringify(results)).not.toContain(NOTES)
  })

  it("search matches URL", async () => {
    const lookup = createKeeperLookup(configFor("keepersecurity.com"))
    const results = await lookup.search("fw.fabrikam")
    expect(results.map((r) => r.recordUid)).toEqual(["r-fw"])
  })

  it("search never matches notes or field contents, so a query cannot probe for a secret", async () => {
    const lookup = createKeeperLookup(configFor("keepersecurity.com"))
    expect(await lookup.search(PASSWORD)).toEqual([])
    expect(await lookup.search("do-not-index-me")).toEqual([])
    // "dc01" appears in Fabrikam's notes but only Contoso's title/URL
    expect((await lookup.search("dc01")).map((r) => r.recordUid)).toEqual(["r-dc01"])
  })

  it("search with a blank query returns nothing", async () => {
    const lookup = createKeeperLookup(configFor("keepersecurity.com"))
    expect(await lookup.search("   ")).toEqual([])
  })

  it("get returns the summary for a known uid and null otherwise", async () => {
    const lookup = createKeeperLookup(configFor("keepersecurity.com"), { includeUsername: true })
    const found = await lookup.get("r-dc01")
    expect(found).toEqual({
      recordUid: "r-dc01",
      title: "Contoso – DC01 local admin",
      recordType: "login",
      url: "https://dc01.contoso.local",
      folderUid: "f-contoso",
      folderName: "Contoso",
      deepLink: "https://keepersecurity.com/vault/#detail/r-dc01",
      username: "contoso\\admin",
    })
    expect(await lookup.get("nope")).toBeNull()
  })

  it("listFolders returns uid, name and parent only", async () => {
    const lookup = createKeeperLookup(configFor("keepersecurity.com"))
    expect(await lookup.listFolders()).toEqual([
      { folderUid: "f-contoso", name: "Contoso" },
      { folderUid: "f-fabrikam", name: "Fabrikam" },
      { folderUid: "f-sub", name: "Servers", parentUid: "f-contoso" },
    ])
  })

  it("uses the config's hostname for deep links", async () => {
    const lookup = createKeeperLookup(configFor("keepersecurity.eu"))
    const [dc01] = await lookup.search("dc01")
    expect(dc01.deepLink).toBe("https://keepersecurity.eu/vault/#detail/r-dc01")
  })

  it("rethrows SDK failures and never writes to the console", async () => {
    getSecrets.mockRejectedValue(new Error("network down"))
    const lookup = createKeeperLookup(configFor("keepersecurity.com"))
    await expect(lookup.search("dc01")).rejects.toThrow("network down")
    for (const spy of consoleSpies) expect(spy).not.toHaveBeenCalled()
  })

  it("listRecords returns every record as a summary and search is a filter over it", async () => {
    const lookup = createKeeperLookup(configFor("keepersecurity.com"))
    const all = await lookup.listRecords()
    expect(all.map((r) => r.recordUid).sort()).toEqual(["r-dc01", "r-fw"])
    expect(JSON.stringify(all)).not.toContain(PASSWORD)
    expect(JSON.stringify(all)).not.toContain(NOTES)
    const matches = await lookup.search("dc01")
    expect(all.filter((r) => matches.some((m) => m.recordUid === r.recordUid))).toEqual(matches)
  })

  it("never writes to the console on the success path either", async () => {
    const lookup = createKeeperLookup(configFor("keepersecurity.com"))
    await lookup.search("dc01")
    await lookup.listFolders()
    for (const spy of consoleSpies) expect(spy).not.toHaveBeenCalled()
  })
})
