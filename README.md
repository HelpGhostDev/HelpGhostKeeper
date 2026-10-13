# @helpghost/keeper-lookup

Read-only lookup over [Keeper Secrets Manager](https://docs.keeper.io/secrets-manager) whose API
cannot return a secret.

## What crosses the boundary

```
Keeper vault ──(KSM app, folders you shared)──► keeper-lookup ──► KeeperRecordSummary
                                                    │
                                    decrypts in memory, returns:
                                    recordUid · title · recordType · url
                                    folderUid · folderName · deepLink
                                    username (opt-in)
```

A `KeeperRecordSummary` has no member for a password, notes, custom field, TOTP or attachment. The
type is the contract; `KEEPER_RECORD_SUMMARY_KEYS` is asserted by a test so any addition is a
deliberate, reviewed change.

## Invariants (each pinned by a test)

1. The projection builds a fresh object from named fields and never spreads the SDK record.
2. `KeeperRecordSummary` has exactly the published key set.
3. `username` is absent, not empty, unless `includeUsername: true`.
4. The package never logs. It returns or throws.
5. `search` matches title and URL only, so a query cannot be used to probe for a secret value.
6. `@keeper-security/secrets-manager-core` is pinned with a tilde range, and the package declares
   no workspace dependencies.

## API

```ts
createKeeperLookup(ksmConfig: string, options?: { includeUsername?: boolean }): KeeperLookup
KeeperLookup.search(query): Promise<KeeperRecordSummary[]>
KeeperLookup.get(recordUid): Promise<KeeperRecordSummary | null>
KeeperLookup.listFolders(): Promise<KeeperFolderSummary[]>
KeeperLookup.listRecords(): Promise<KeeperRecordSummary[]>  // every visible record; search is a filter over it
exchangeOneTimeToken(oneTimeToken, hostName?): Promise<string>   // base64 device config to store
```

`exchangeOneTimeToken` returns the application's device config. It is a credential — store it
encrypted, never log it. The one-time token is consumed by the call.

## Live smoke test

```
pnpm exchange <one-time-token>   # prints a config; put it in .env as KEEPER_KSM_CONFIG
pnpm test                        # live.smoke.test.ts runs only when that variable is set
```

Keeper's *Lock IP* option must be off on the device, or the config only works from the IP that
exchanged the token.

## Status

Pre-release. To be published to npm with provenance once the API is stable.
