import { describe, expect, it } from "vitest"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { checksumOf, loadLocalMigrations, migrationStatus, splitStatements } from "../migrations"

const PUBLIC_EVENT_LINK = "20260921120000_impact_lab_public_event_link"

describe("splitStatements", () => {
  it("splits the public-event-link migration into its three DDL statements", async () => {
    const sql = await readFile(
      path.join(process.cwd(), "prisma", "migrations", PUBLIC_EVENT_LINK, "migration.sql"),
      "utf8",
    )
    const statements = splitStatements(sql)
    expect(statements).toHaveLength(3)
    expect(statements[0]).toMatch(/^ALTER TABLE "impact_lab_events" ADD COLUMN/)
    expect(statements[1]).toMatch(/^CREATE INDEX "impact_lab_events_publicEventId_idx"/)
    expect(statements[2]).toMatch(/^ALTER TABLE "impact_lab_events" ADD CONSTRAINT/)
    for (const s of statements) expect(s).not.toMatch(/^--/m)
  })

  it("refuses dollar-quoted bodies rather than mis-splitting them", () => {
    expect(() => splitStatements("CREATE FUNCTION f() AS $$ BEGIN; END $$;")).toThrow(/unsupported/)
  })
})

describe("checksumOf", () => {
  it("is the SHA-256 hex of the text", () => {
    expect(checksumOf("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
  })
})

describe("loadLocalMigrations", () => {
  it("lists the shipped migrations in name order with checksums", async () => {
    const local = await loadLocalMigrations(process.cwd())
    const names = local.map((m) => m.name)
    expect(names).toEqual([...names].sort())
    expect(names).toContain(PUBLIC_EVENT_LINK)
    expect(local.every((m) => /^[0-9a-f]{64}$/.test(m.checksum))).toBe(true)
  })
})

describe("migrationStatus", () => {
  const local = [
    { name: "a", checksum: "1" },
    { name: "b", checksum: "2" },
    { name: "c", checksum: "3" },
    { name: "d", checksum: "4" },
  ]
  it("classifies applied, pending, modified and failed", () => {
    const now = new Date()
    const status = migrationStatus(
      [
        { name: "a", checksum: "1", finishedAt: now, rolledBackAt: null },
        { name: "b", checksum: "x", finishedAt: now, rolledBackAt: null },
        { name: "c", checksum: "3", finishedAt: null, rolledBackAt: null },
      ],
      local,
    )
    expect(status).toEqual({ applied: ["a"], modified: ["b"], failed: ["c"], pending: ["d"] })
  })
  it("treats a rolled-back row as pending again", () => {
    const status = migrationStatus(
      [{ name: "a", checksum: "1", finishedAt: null, rolledBackAt: new Date() }],
      local.slice(0, 1),
    )
    expect(status.pending).toEqual(["a"])
  })
})
