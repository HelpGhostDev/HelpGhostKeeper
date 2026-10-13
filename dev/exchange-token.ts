import { exchangeOneTimeToken } from "../src/main"

// Local-only helper: prints the device config for KEEPER_KSM_CONFIG in .env so the live
// smoke test can run. The token is consumed by this call; run it once per token.
const [token, hostName] = process.argv.slice(2)
if (!token) {
  process.stderr.write("usage: pnpm exchange <one-time-token> [hostname]\n")
  process.exit(1)
}

exchangeOneTimeToken(token, hostName)
  .then((config) => {
    process.stdout.write(`${config}\n`)
  })
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(1)
  })
