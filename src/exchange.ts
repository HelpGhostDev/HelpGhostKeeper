import { getSecrets, initializeStorage, inMemoryStorage } from "@keeper-security/secrets-manager-core"

/**
 * Turns a Keeper one-time access token into a persistent device config (the same base64 JSON the
 * Keeper vault UI offers as "Configuration File"). The token is single-use: Keeper binds the device
 * on the first secrets fetch, which is why that fetch happens here and not lazily on first lookup —
 * a caller that stored the pre-bind storage would hold a config that can never authenticate.
 */
export async function exchangeOneTimeToken(oneTimeToken: string, hostName?: string): Promise<string> {
  const backing: Record<string, unknown> = {}
  const storage = inMemoryStorage(backing)
  await initializeStorage(storage, oneTimeToken.trim(), hostName)
  await getSecrets({ storage })
  return Buffer.from(JSON.stringify(backing)).toString("base64")
}
