import type { KeeperRecord } from "@keeper-security/secrets-manager-core"
import { KeeperRecordSummary } from "./types"

// The SDK types `record.data` as `any`; this is the subset we read.
interface SdkField {
  type?: unknown
  value?: unknown
}

interface SdkRecordData {
  title?: unknown
  type?: unknown
  fields?: unknown
}

const firstStringField = (fields: unknown, type: string): string | undefined => {
  if (!Array.isArray(fields)) return undefined
  const field = (fields as SdkField[]).find((f) => f?.type === type)
  const value = Array.isArray(field?.value) ? field.value[0] : undefined
  return typeof value === "string" && value.length > 0 ? value : undefined
}

const asString = (value: unknown): string => (typeof value === "string" ? value : "")

/**
 * Builds a summary from NAMED fields only. It must never spread or clone the SDK record: `data`
 * holds the password, notes and custom fields, and a spread would carry them into the output the
 * moment someone added a key to the summary type.
 */
export function toRecordSummary(
  record: KeeperRecord,
  { folderNames, hostname, includeUsername }: { folderNames: Map<string, string>; hostname: string; includeUsername: boolean },
): KeeperRecordSummary {
  const data = (record.data ?? {}) as SdkRecordData
  const folderUid = record.innerFolderUid ?? record.folderUid ?? ""
  const url = firstStringField(data.fields, "url")
  const username = includeUsername ? firstStringField(data.fields, "login") : undefined

  return {
    recordUid: record.recordUid,
    title: asString(data.title),
    recordType: asString(data.type),
    ...(url !== undefined ? { url } : {}),
    folderUid,
    folderName: folderNames.get(folderUid) ?? "",
    deepLink: `https://${hostname}/vault/#detail/${record.recordUid}`,
    ...(username !== undefined ? { username } : {}),
  }
}
