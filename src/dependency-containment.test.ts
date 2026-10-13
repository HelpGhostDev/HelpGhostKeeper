import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"

const readOwnDeps = (): Record<string, string> => {
  const manifest = JSON.parse(readFileSync(join(resolve(__dirname, ".."), "package.json"), "utf8")) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    peerDependencies?: Record<string, string>
    optionalDependencies?: Record<string, string>
  }
  return {
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
    ...manifest.optionalDependencies,
  }
}

describe("dependency containment", () => {
  it("pins the Keeper SDK with a tilde range", () => {
    expect(readOwnDeps()["@keeper-security/secrets-manager-core"]).toMatch(/^~\d+\.\d+\.\d+$/)
  })

  it("declares no workspace dependencies, so the published tarball resolves on its own", () => {
    const workspaceDeps = Object.entries(readOwnDeps()).filter(([, range]) => range.startsWith("workspace:"))
    expect(workspaceDeps).toEqual([])
  })
})
