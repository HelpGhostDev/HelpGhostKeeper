import { getFolders, getSecrets, loadJsonConfig } from "@keeper-security/secrets-manager-core"
import { toRecordSummary } from "./projection"
import { KeeperFolderSummary, KeeperLookup, KeeperLookupOptions, KeeperRecordSummary } from "./types"

const DEFAULT_HOSTNAME = "keepersecurity.com"

/**
 * One lookup per call site, not cached: the SDK keeps decrypted record keys in process memory for
 * the life of the storage object, so a short-lived instance bounds that lifetime to one request.
 */
export function createKeeperLookup(ksmConfig: string, options: KeeperLookupOptions = {}): KeeperLookup {
  const includeUsername = options.includeUsername ?? false
  const storage = loadJsonConfig(ksmConfig)

  const folderSummaries = async (): Promise<KeeperFolderSummary[]> => {
    const folders = await getFolders({ storage })
    return folders.map((folder) => ({
      folderUid: folder.folderUid,
      name: folder.name ?? "",
      ...(folder.parentUid ? { parentUid: folder.parentUid } : {}),
    }))
  }

  const allSummaries = async (): Promise<KeeperRecordSummary[]> => {
    const hostname = (await storage.getString("hostname")) ?? DEFAULT_HOSTNAME
    const [folders, secrets] = await Promise.all([folderSummaries(), getSecrets({ storage })])
    const folderNames = new Map(folders.map((folder) => [folder.folderUid, folder.name]))
    return secrets.records.map((record) => toRecordSummary(record, { folderNames, hostname, includeUsername }))
  }

  return {
    async search(query) {
      const needle = query.trim().toLowerCase()
      if (needle.length === 0) return []
      // Filtering the SUMMARIES (not the SDK records) is what makes "title and URL only" structural:
      // there is no notes or password member here to match against.
      const summaries = await allSummaries()
      return summaries.filter(
        (summary) => summary.title.toLowerCase().includes(needle) || (summary.url ?? "").toLowerCase().includes(needle),
      )
    },
    async get(recordUid) {
      const summaries = await allSummaries()
      return summaries.find((summary) => summary.recordUid === recordUid) ?? null
    },
    listFolders: folderSummaries,
    listRecords: allSummaries,
  }
}
