/**
 * One colour per Impact Lab track, as Tailwind class strings.
 *
 * A judge walking the room, a member reading their dashboard and an organiser
 * at the desk all look at the same three tracks within the same hour, so the
 * colour a track wears has to be the same on every screen. Declared once here
 * rather than inline per component — that is the only way a track's colour
 * cannot drift between the judge list and the member reveal.
 *
 * The assignments are a fixed map, not a hash of the key. Tailwind compiles the
 * class strings it can see in source, so a class name computed at runtime from
 * a hash would simply not exist in the stylesheet; a literal map is both what
 * the build needs and what lets an organiser predict the room's colours.
 * Unknown keys take the neutral tone instead of a colour nobody chose.
 */

/** Class strings for one track's colour, all literal so Tailwind emits them. */
export interface TrackTone {
  /** Border + background + text for a pill or chip carrying the track label. */
  pill: string
  /** Background for a small dot standing in for the track where a pill won't fit. */
  dot: string
  /** Text colour alone, for a label that already sits on its own surface. */
  label: string
}

/** Track with no key, or a key this event does not colour. */
const NEUTRAL: TrackTone = {
  pill: "border-border-default bg-bg-card text-text-dim",
  dot: "bg-text-dim",
  label: "text-text-dim",
}

/**
 * The colours for tonight's three tracks.
 *
 * `kazi` uses the theme's `cyan` token rather than a raw Tailwind sky: the
 * member reveal and the admin run detail already dressed a track in cyan
 * before this helper existed, so cyan is the established "third track" colour
 * here and reusing it keeps those two screens unchanged in appearance.
 */
const TONES: Record<string, TrackTone> = {
  elimu: {
    pill: "border-green-primary/50 bg-green-primary/10 text-green-primary",
    dot: "bg-green-primary",
    label: "text-green-primary",
  },
  kilimo: {
    pill: "border-amber/50 bg-amber/10 text-amber",
    dot: "bg-amber",
    label: "text-amber",
  },
  kazi: {
    pill: "border-cyan/50 bg-cyan/10 text-cyan",
    dot: "bg-cyan",
    label: "text-cyan",
  },
}

/**
 * The colour classes for a track key.
 *
 * @param trackKey The matcher's stable track key, or null/undefined for a team
 *   or participant with no declared track.
 * @returns Tailwind class strings — the neutral tone for an absent or unknown key.
 */
export function trackTone(trackKey: string | null | undefined): TrackTone {
  if (!trackKey) return NEUTRAL
  return TONES[trackKey.toLowerCase()] ?? NEUTRAL
}
