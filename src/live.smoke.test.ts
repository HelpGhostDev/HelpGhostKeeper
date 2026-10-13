import { describe, expect, it } from "vitest"
import { createKeeperLookup } from "./lookup"
import { KEEPER_RECORD_SUMMARY_KEYS } from "./types"

// Runs only when KEEPER_KSM_CONFIG is set (see README). Produce one with:
//   pnpm exchange <one-time-token>
const config = process.env.KEEPER_KSM_CONFIG

describe.skipIf(!config)("keeper-lookup live smoke", () => {
  it("lists the shared folders granted to the application", async () => {
    const lookup = createKeeperLookup(config!)
    const folders = await lookup.listFolders()
    expect(folders.length).toBeGreaterThan(0)
    for (const folder of folders) expect(Object.keys(folder).sort()).toEqual(expect.arrayContaining(["folderUid", "name"]))
  })

  it("returns only summary keys for every record, with no secret-looking members", async () => {
    const lookup = createKeeperLookup(config!, { includeUsername: true })
    // An empty needle is rejected, so search on the most common URL character instead.
    const results = [...(await lookup.search(".")), ...(await lookup.search(" "))]
    for (const summary of results) {
      for (const key of Object.keys(summary)) expect(KEEPER_RECORD_SUMMARY_KEYS).toContain(key)
      expect(summary.deepLink).toMatch(/^https:\/\/[a-z.]+\/vault\/#detail\/[A-Za-z0-9_-]+$/)
    }
  })
})
