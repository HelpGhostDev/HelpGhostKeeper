/**
 * The published security contract of this package. A record summary is the ONLY shape that ever
 * leaves it, and it has no member that can carry a secret: no password, notes, custom fields,
 * TOTP, or attachments. `KEEPER_RECORD_SUMMARY_KEYS` is asserted by a test so that adding a key is
 * a visible, deliberate change to the contract rather than an accident.
 */
export const KEEPER_RECORD_SUMMARY_KEYS = [
  "recordUid",
  "title",
  "recordType",
  "url",
  "folderUid",
  "folderName",
  "deepLink",
  "username",
] as const

export interface KeeperRecordSummary {
  recordUid: string
  title: string
  recordType: string
  url?: string
  folderUid: string
  folderName: string
  /** Opens the record in the Keeper web vault. Carries no secret; Keeper enforces access on open. */
  deepLink: string
  /** Present only when the lookup was created with `includeUsername: true`. */
  username?: string
}

export interface KeeperFolderSummary {
  folderUid: string
  name: string
  parentUid?: string
}

export interface KeeperLookupOptions {
  /** Default false. Usernames are not Keeper secrets but some reviewers class them as sensitive. */
  includeUsername?: boolean
}

export interface KeeperLookup {
  /** Case-insensitive substring match on title and URL only — never notes or field contents. */
  search(query: string): Promise<KeeperRecordSummary[]>
  get(recordUid: string): Promise<KeeperRecordSummary | null>
  listFolders(): Promise<KeeperFolderSummary[]>
  /** Every record the application can see, projected. `search` is a filter over this. */
  listRecords(): Promise<KeeperRecordSummary[]>
}
