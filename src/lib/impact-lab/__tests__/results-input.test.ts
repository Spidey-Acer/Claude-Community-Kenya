/**
 * `looksLikePerTrackWinners` regression coverage — the guard that stops the
 * next Impact Lab 02, not the correction that fixed that one.
 *
 * Impact Lab 02 (3 September 2026): an operator ticked three teams as an
 * overall podium that were actually the panel's separate per-track calls —
 * one team per track, in a three-track run — published as a 1-2-3 that named
 * a team who had won nothing. `publish/route.ts` and `results/correct`'s
 * POST both refuse this shape with `PODIUM_LOOKS_LIKE_TRACK_WINNERS` unless
 * `confirmPodium: true` is sent — see this function's own doc comment for
 * the exact fingerprint it checks.
 *
 * The second test below matters more than the first: a guard that blocks a
 * genuine podium event gets disabled by the first operator it inconveniences.
 * It uses Impact Lab: AI Mashinani 01's real published July 2026 record —
 * champion BiasharaGPT (Table 29, Biashara) 75.4, first runner-up VilCare
 * (Table 1, Afya) 55.4, second runner-up Oryn (Table 33, Biashara) 73.4. That
 * event genuinely announced an overall podium: VilCare at 55.4 outranks Oryn
 * at 73.4 only because the panel said so, and BiasharaGPT and Oryn share the
 * Biashara track — 3 announced teams in a 5-track run (Afya, Biashara, Elimu,
 * Huduma, Kilimo), not one team per track. The guard must not fire on it.
 */

import { describe, expect, it, vi } from "vitest"

// `results-input.ts` imports `./member`, which value-imports "@/auth" for an
// unrelated export (`checkMemberAccess`) — mock it out so next-auth's module
// resolution never has to run in the vitest node environment. Same pattern
// as the route tests under src/app/api/admin/impact-lab/**/__tests__/.
vi.mock("@/auth", () => ({ auth: vi.fn() }))

import { looksLikePerTrackWinners } from "../results-input"

describe("looksLikePerTrackWinners", () => {
  it("fires on the Impact Lab 02 shape — one team per track, ticked count equals track count", () => {
    const teamsMeta = new Map([
      ["team-elimu", { track: "Elimu" }],
      ["team-kilimo", { track: "Kilimo" }],
      ["team-kazi", { track: "Kazi" }],
    ])
    const allTracks = new Set(["Elimu", "Kilimo", "Kazi"])
    expect(
      looksLikePerTrackWinners(["team-elimu", "team-kilimo", "team-kazi"], teamsMeta, allTracks)
    ).toBe(true)
  })

  it("does not fire on Impact Lab 01 (July 2026) — a genuine podium, two announced teams sharing a track", () => {
    const teamsMeta = new Map([
      ["team-biasharagpt", { track: "Biashara (Small Business)" }],
      ["team-vilcare", { track: "Afya (Health)" }],
      ["team-oryn", { track: "Biashara (Small Business)" }],
    ])
    const allTracks = new Set([
      "Afya (Health)",
      "Biashara (Small Business)",
      "Elimu (Education)",
      "Huduma (Government Services)",
      "Kilimo (Agriculture)",
    ])
    expect(
      looksLikePerTrackWinners(
        ["team-biasharagpt", "team-vilcare", "team-oryn"],
        teamsMeta,
        allTracks
      )
    ).toBe(false)
  })

  it("does not fire when the ticked count differs from the track count, even with distinct tracks", () => {
    const teamsMeta = new Map([
      ["team-a", { track: "Afya" }],
      ["team-b", { track: "Biashara" }],
    ])
    expect(looksLikePerTrackWinners(["team-a", "team-b"], teamsMeta, new Set(["Afya", "Biashara", "Kilimo"]))).toBe(
      false
    )
  })

  it("does not fire on an empty announcement", () => {
    expect(looksLikePerTrackWinners([], new Map(), new Set(["Afya"]))).toBe(false)
  })

  it("does not fire when a ticked team's track cannot be resolved", () => {
    const teamsMeta = new Map([["team-a", { track: "Afya" }]])
    expect(looksLikePerTrackWinners(["team-a", "team-unknown"], teamsMeta, new Set(["Afya", "Kilimo"]))).toBe(
      false
    )
  })
})
