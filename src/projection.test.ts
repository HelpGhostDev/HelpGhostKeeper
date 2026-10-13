import { describe, expect, it } from "vitest"
import type { KeeperRecord } from "@keeper-security/secrets-manager-core"
import { toRecordSummary } from "./projection"
import { KEEPER_RECORD_SUMMARY_KEYS } from "./types"

// Every secret-bearing place a Keeper login record has. Each value is distinctive so a deep
// string search of the projection output proves none of them leak.
const SECRETS = {
  password: "pw-Zx9!secret-7Qp",
  notes: "notes-DSRM-recovery-phrase-3311",
  customValue: "custom-api-key-77aa",
  totp: "otpauth://totp/Contoso:admin?secret=JBSWY3DPEHPK3PXP",
  fileName: "attachment-vpn-profile.ovpn",
}

const fixtureRecord = (): KeeperRecord => ({
  recordUid: "rec-uid-1",
  folderUid: "shared-1",
  innerFolderUid: "inner-1",
  revision: 3,
  data: {
    title: "Contoso – DC01 local admin",
    type: "login",
    fields: [
      { type: "login", value: ["contoso\\admin"] },
      { type: "password", value: [SECRETS.password] },
      { type: "url", value: ["https://dc01.contoso.local"] },
      { type: "oneTimeCode", value: [SECRETS.totp] },
    ],
    custom: [{ type: "text", label: "API key", value: [SECRETS.customValue] }],
    notes: SECRETS.notes,
  },
  files: [{ fileUid: "f1", data: { name: SECRETS.fileName } }],
})

const folderNames = new Map([
  ["shared-1", "Contoso"],
  ["inner-1", "Contoso / Servers"],
])

describe("toRecordSummary", () => {
  it("never carries a secret value anywhere in its output", () => {
    const summary = toRecordSummary(fixtureRecord(), { folderNames, hostname: "keepersecurity.com", includeUsername: true })
    const serialized = JSON.stringify(summary)
    for (const secret of Object.values(SECRETS)) {
      expect(serialized).not.toContain(secret)
    }
  })

  it("emits exactly the published key set when every optional field is present", () => {
    const summary = toRecordSummary(fixtureRecord(), { folderNames, hostname: "keepersecurity.com", includeUsername: true })
    expect(Object.keys(summary).sort()).toEqual([...KEEPER_RECORD_SUMMARY_KEYS].sort())
  })

  it("builds a fresh object rather than carrying the SDK record along", () => {
    const record = fixtureRecord()
    const summary = toRecordSummary(record, { folderNames, hostname: "keepersecurity.com", includeUsername: false })
    expect(summary).not.toHaveProperty("data")
    expect(summary).not.toHaveProperty("revision")
    expect(summary).not.toHaveProperty("files")
    expect(Object.keys(summary).every((key) => (KEEPER_RECORD_SUMMARY_KEYS as readonly string[]).includes(key))).toBe(true)
  })

  it("omits username entirely (not empty) unless includeUsername is true", () => {
    const withoutUsername = toRecordSummary(fixtureRecord(), { folderNames, hostname: "keepersecurity.com", includeUsername: false })
    expect("username" in withoutUsername).toBe(false)

    const withUsername = toRecordSummary(fixtureRecord(), { folderNames, hostname: "keepersecurity.com", includeUsername: true })
    expect(withUsername.username).toBe("contoso\\admin")
  })

  it("prefers the inner folder for name and uid, falling back to the shared folder", () => {
    const inner = toRecordSummary(fixtureRecord(), { folderNames, hostname: "keepersecurity.com", includeUsername: false })
    expect(inner.folderUid).toBe("inner-1")
    expect(inner.folderName).toBe("Contoso / Servers")

    const record = fixtureRecord()
    delete record.innerFolderUid
    const shared = toRecordSummary(record, { folderNames, hostname: "keepersecurity.com", includeUsername: false })
    expect(shared.folderUid).toBe("shared-1")
    expect(shared.folderName).toBe("Contoso")
  })

  it("builds the web-vault deep link on the tenant's Keeper hostname", () => {
    const eu = toRecordSummary(fixtureRecord(), { folderNames, hostname: "keepersecurity.eu", includeUsername: false })
    expect(eu.deepLink).toBe("https://keepersecurity.eu/vault/#detail/rec-uid-1")
  })

  it("tolerates records with no fields, no title and no folder", () => {
    const bare: KeeperRecord = { recordUid: "rec-2", revision: 1, data: {} }
    const summary = toRecordSummary(bare, { folderNames, hostname: "keepersecurity.com", includeUsername: true })
    expect(summary).toEqual({
      recordUid: "rec-2",
      title: "",
      recordType: "",
      folderUid: "",
      folderName: "",
      deepLink: "https://keepersecurity.com/vault/#detail/rec-2",
    })
  })
})
