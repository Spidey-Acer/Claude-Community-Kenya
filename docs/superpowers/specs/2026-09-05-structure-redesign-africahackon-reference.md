# CCK site restructure: borrow africahackon.com's section grammar, keep Karibu

**Date:** 2026-09-05
**Status:** DRAFT, awaiting Peter's yes on the three decisions below
**Reference site:** https://africahackon.com (16 pages scouted across main site, events and academy subdomains)
**Audited site:** https://www.claudekenya.org (every public page crawled, desktop + mobile)
**Relationship to prior specs:** extends `2026-07-05-home-karibu-redesign-design.md`; the Karibu identity stays.

---

## 0. Three decisions Peter has to make

### Decision 1: structure, not skin (recommended)

Africahackon is dark, red, sans-only, photo-first. CCK is warm-light Karibu with serif display, locked in on 2026-07-05 when Terminal Noir was retired.

"Look like Dr Bright's" is read as **adopt the page structure and section grammar**, not the dark red skin.

| Borrow (structure) | Do not copy |
|---|---|
| Full-bleed photo/video hero with copy over it and 2 to 3 CTAs | Red palette, sans-only type |
| Tinted photo banner + breadcrumb opening every inner page | Their copy, images, or video |
| Impact stats card overlapping the hero bottom edge | Counters that render "0" without JS |
| Split photo/text "who we are" block with a framed photo | Plugin-styled events subdomain that breaks the brand |
| Large photo-gallery grid (16 tiles) | Chat bubble overlapping form fields |
| Partner / supporter logo wall | Blank layout gaps (their Titans, Contact, Trainers pages) |
| FAQ accordion reused on inner pages | Placeholder testimonials and FAQ left live |
| Full-width closing CTA band on every page | Metadata overlaid on poster art that already carries text |
| Staggered team grid with per-person social row | |
| Program page pattern: weekly curriculum cards + key-value details block (for workshops / Fluent later) | |

Cost of the other path (adopt the dark skin): re-tokenise every page, redo the Karibu spec, re-treat every photo. Two to three weeks of rework before any structural gain. Not recommended.

The site already ships a real dark mode. Every new section is designed in both, since roughly half of Kenyan phones run dark.

### Decision 2: the hero video

Facts found on 2026-09-05:

- The only Impact Lab video on disk is **Impact Lab 02** (the winners reel), rendered today and still in flux, with captioned, loudness-normalised and preview variants in `C:/Projects/Claude-Community-Kenya/events/Claude Conversations/impactlab/reels/`. **No Impact Lab 01 video was found under C:/Projects and no social URL is recorded.** Assumption: 02 is the one. If Peter means 01, he supplies the file or link.
- It is a **vertical reel with voice and captions**. A muted looping background throws away what made it travel.
- The site has **no video infrastructure**: no `<video>`, no player, no video host. Cloudflare R2 at `media.claudekenya.org` is already in `next.config.ts` remotePatterns and hosts gallery photos, so video goes there too.
- The homepage measured 9.1 s domReady headless on first load. The hero image is the LCP element and lacks `priority`.

Two shapes:

**(a) Silent b-roll background** for the home hero (recommended). An 8 to 12 s 16:9 cut of crowd, build hall, demos. No captions, no voice. Copy and CTAs sit over it the way africahackon's photo hero works. Poster frame is the LCP.

**(b) Reel in a phone frame** as a second placement in "Community in action". Vertical reel in a device frame, poster + tap-to-play with sound. Keeps the viral cut intact. Not the hero: a 60 s captioned reel autoplaying muted reads as broken.

Recommendation: (a) in the hero, (b) in Community in action, both cut from the same source render.

Delivery rules (the site claims mobile-first, Kenyan data is the constraint):

- Hero loop: h264 mp4 + vp9 webm, 1280x720, no audio track, 4 MB or less, plus a webp poster of 120 KB or less. Uploaded to R2 under `video/home-hero-2026-09/`.
- `<video autoplay muted loop playsinline preload="none" poster=...>`, source attached only after `window.load`.
- Poster only (no video request) when: viewport under 768 px, `prefers-reduced-motion: reduce`, `navigator.connection.saveData`, or effectiveType 2g/3g.
- Poster carries `priority` (fetchpriority high).
- Acceptance: LCP 2.5 s or better on a throttled 4G Lighthouse run; homepage mobile transfer 1.2 MB or less; no CLS when the video attaches.

### Decision 3: content lands with the chrome, or the chrome ships empty

Photo-first structure with today's content ships as empty frames.

| Slot the new structure needs | What exists today |
|---|---|
| 16-tile gallery grid | 8 photos across 3 events |
| Event cards with cover art | 5 of 9 visible cards show a hatch placeholder |
| Team grid | 1 person (Peter) versus "dozens of volunteers" on About |
| "Next up" event strip | 0 upcoming events, 12 past |
| Supporter / partner wall | Anthropic only; venues (Hackhouse Africa, Blockchain Centre, Zone01 Kisumu, Technical University of Mombasa) unlisted |
| 5 testimonials | Names flagged "pending sign-off" in source; one attributed to "James Lloyd" |

Peter owns the inputs list in section 6. Engineering ships designed empty states so nothing renders blank when a slot is short.

---

## 1. Reference: africahackon's homepage, in order

Nav (sticky, CTA pill) → full-bleed photo hero, eyebrow pill, one headline, three CTAs → split intro with framed photo and eyebrow → impact card with 3 counters overlapping the section boundary → program promo A (video background, bullets, CTA) → program promo B mirrored → 3-card initiatives grid → icon list + framed photo with overlapping badge → partner logo carousel on a photo band → 16-tile community gallery → FAQ accordion → closing CTA band → footer with newsletter field → floating WhatsApp bubble.

Inner pages: tinted photo banner with title + breadcrumb, body, partner carousel, CTA band, footer. The same FAQ and CTA band components appear on every page, which is why the site reads as one piece despite being Elementor.

## 2. CCK audit: what gets fixed in the same pass

Home (2026-09-05 homepage audit):

1. Member count labelled "members" is a non-deduplicated sum of Discord + WhatsApp + LinkedIn follows. Relabel "across WhatsApp, Discord & socials" or dedupe.
2. Hero stat server-renders "~0 members" and counts up client-side. Render the final number; animate only visually.
3. Testimonial "James Lloyd · Research" and four other names unverified (source file says pending sign-off).
4. Footer cities omit Kisumu while the stats say 3 cities.
5. Marquee ticker cloned six times without `aria-hidden`.
6. No next-event or last-event hook anywhere.
7. Three competing joins above the fold (nav Join → /signup, hero → WhatsApp, Sign in).
8. "Start with these" tags an event recap as "resource"; only two cards.
9. Showcase shows two projects, both by CCK itself.
10. Hero subtitle leads with "Founder-led, mobile-first" (insider language).
11. "What we do" card 01 has a large empty block above its title at 1440.
12. Hero image lacks `priority`; 51 JS requests; 9.1 s domReady headless.
13. Vestigial `persona-pro` / `cck-skin` flag written to localStorage on every load.

Inner pages (full-site crawl):

14. `/resources/api-guide` and `/resources/production-guide`: inactive tab panels reserve scroll height and render nothing, leaving thousands of pixels of dead scroll. Verify in a real browser, then fix.
15. `/resources/links` is still Terminal Noir (green-on-black, mac window chrome). The one remaining leak.
16. `/resources/courses` promises "Course 1 of 5"; courses 2 to 5 absent.
17. Nav "Community" and "Tools & Prompts" both resolve to `/community`.
18. `/signup` and `/login` use an alternate footer and lack the theme toggle.
19. `/events`: 5 of 9 visible cards have no cover art; no upcoming section.
20. `/team`: one person. `/gallery`: 8 photos. `/newsletter`: honest but thin empty state. `/showcase`: 2 posts with four decorative filter pills.
21. Guide sub-pages (Getting Started, Claude Code, Advanced Workflows) are one card each under heavy "file" chrome.

Console: clean on every page. Broken images: none. Meta and canonical: correct. The blank gaps in the first crawl's screenshots were capture artifacts, verified by re-crawl.

## 3. New home composition (Karibu tokens, africahackon grammar)

1. **Nav** as today, sticky. One primary CTA: **Join** → `/join`. "Sign in" stays as a text link. Hero and footer CTAs point to the same `/join`; the WhatsApp deep link lives there, not in three places.
2. **Hero, full-bleed.** Video loop (Decision 2a) with poster and a warm dark gradient so Karibu paper-coloured type reads. Eyebrow pill "Karibu · Kenya's Claude community". Headline stays. Subtitle rewritten: "Free meetups in Nairobi, Mombasa and Kisumu. Workshops, build days and a room that answers questions. Beginners welcome." Two CTAs: Join the community / See what we've built. Bottom-left chip: next event, or "Last: Impact Lab 02 · 2 Sep · recap →" when nothing is scheduled.
3. **Impact card**, overlapping the hero bottom edge by about 48 px: Events hosted · Builders reached (relabelled) · Cities · Since Jan 2026. Numbers server-rendered.
4. **Who we are**, split: framed photo (clay 1 px border, sand offset shadow, the Karibu answer to their red frame) + "How CCK started" copy from `/about` + "Read our story →".
5. **Next up / Last event** strip, replacing the empty events section: one wide card with cover art, date, venue, seats, CTA. Falls back to the latest recap post.
6. **What we do**: keep the four cards, fix card 01, put the "Explore resources" link on every card.
7. **Two tracks**: keep; "See engineering events" filters `/events?type=workshops,hackathons`.
8. **Made in Kenya** (showcase): 3 member projects, not CCK's own. Empty state: "Be the first, share yours →".
9. **Community in action**: phone-framed reel (Decision 2b) left, 5-slide testimonial carousel right with verified names.
10. **Faces of the community**: 12-tile photo grid from `/gallery` newest first, "See all photos →".
11. **Supported by**: Anthropic + venue partner wall, greyscale logos, colour on hover.
12. **FAQ**: 5 questions from `/faq` in the shared accordion, "All questions →".
13. **CTA band**: full-width clay panel, "Come build with us.", Join on WhatsApp / Join Discord. The same component ends every inner page.
14. **Footer**: add Kisumu; add a newsletter field feeding `/newsletter`.

Ticker marquee: keep, one instance, clones `aria-hidden`.

## 4. Inner-page template (shared primitives)

Every public page opens with `PageBanner`: tinted photo (page-specific, from the gallery bucket), eyebrow breadcrumb "Home / Events", H1, one-line subtitle. Every page ends with `CtaBand`. Components built once:

| Primitive | Used on |
|---|---|
| `PageBanner` | about, events, gallery, resources, blog, newsletter, faq, community, showcase, projects, team, join |
| `CtaBand` | every public page |
| `FaqAccordion` | home, faq, join, event detail |
| `PhotoGrid` | home, gallery, event detail |
| `SupporterWall` | home, about |
| `StatsCard` | home, about |
| `FramedPhoto` | home, about, team |
| `HeroVideo` | home only |

## 5. Page-by-page mapping

| CCK page | Borrowed pattern | Defect fixed in the same pass |
|---|---|---|
| `/` | Sections 1 to 14 above | Items 1 to 13 |
| `/about` | Banner; framed intro; staggered team grid with social row; supporter wall; CTA band | "Meet the full team" leads to one person |
| `/team` | Staggered grid, social icons, informal one-line bios | Add organisers + city leads (inputs list) |
| `/events` | Banner; Upcoming / Past split with a designed empty state; cards always have art (auto-generated Karibu cover when none is uploaded) | 5 bare cards; no upcoming section |
| `/events/[slug]` | Sticky details sidebar (exists); photo grid; "More events"; never overlay metadata on poster art | none |
| `/gallery` | 4-column grid, album chips | 8 photos → inputs list |
| `/resources` | Banner; keep hub cards; add FAQ | none |
| `/resources/api-guide`, `/resources/production-guide` | Sidebar tabs that render only the active panel | Dead scroll (item 14) |
| `/resources/links` | Karibu card list grouped by category | Terminal Noir leak (item 15) |
| `/resources/courses` | Numbered course cards 1 to 5 with a "coming" state | Missing 2 to 5 (item 16) |
| `/blog` | Banner; featured card stays | none |
| `/newsletter` | Banner; inline signup + "what you'll get" bullets | thin |
| `/faq` | Banner; shared accordion | none |
| `/community` | Banner | Nav duplicate (item 17) |
| `/showcase`, `/projects` | Banner; hide filter pills below 8 posts | 2 posts each |
| `/join` | Banner; keep 3-step; add FAQ + CTA band | none |
| `/signup`, `/login` | Standard footer + theme toggle | item 18 |

## 6. Content inputs Peter owns

- [ ] Hero video source: confirm Impact Lab 02, or supply 01. Final render, not a preview variant.
- [ ] 20 to 30 gallery photos from the `impactlab/wall-picks.md` selections plus Conversations and Production Workshop, exported at 1600 px wide or less to R2.
- [ ] Cover art for the 5 bare event cards, or approve the auto-generated Karibu cover.
- [ ] Team roster: organisers and city leads, one photo + one line + one social each.
- [ ] Testimonial sign-off: five names, spellings, roles; remove or correct "James Lloyd".
- [ ] Venue partner logos and permission to list them.
- [ ] Next event date, or approve the "last event" fallback on the hero until one exists.
- [ ] Member-count wording: "builders reached", or a deduplicated count.

## 7. Phasing and routing

Branch: fresh `feat/structure-redesign` off `master`. The repo currently sits on `fix/card-pill-track-not-overall` with uncommitted Impact Lab changes; nothing is built there.

| Phase | Scope | Tier | Gate |
|---|---|---|---|
| 0 | Correctness PR: items 1, 2, 4, 5, 12, 13, 14, 15, 17, 18 | sonnet | typecheck + lint + Peter clicks through locally |
| 1 | Design direction: a `design` canvas with home (desktop + mobile, light + dark) and one inner page, built from this spec | fable | Peter's visual yes |
| 2 | Primitives (section 4) + new home composition + HeroVideo with the R2 delivery rules | sonnet from a written task plan; opus review of the video loading path | Lighthouse mobile LCP 2.5 s or better, no CLS from video attach |
| 3 | Inner pages adopt the primitives (section 5) | sonnet, one PR per 3 to 4 pages | screenshot diff per page, both themes |
| 4 | Content lands (section 6) | Peter + haiku for uploads and metadata | every slot filled or showing its designed empty state |

Phase 0 ships independent of Decisions 1 to 3. The code-level task plan (tests and commits per task) is written after Peter's yes on this document and on the Phase 1 canvas.

## 8. Acceptance checks

- Homepage mobile transfer 1.2 MB or less; LCP 2.5 s or better on throttled 4G; CLS under 0.1 with video attach.
- Server HTML contains the real member figure and event data (no "~0", no empty upcoming section).
- Every public page: same nav, same footer, `PageBanner` at top, `CtaBand` at bottom, light and dark screenshots reviewed.
- No public page references Terminal Noir tokens.
- Ticker clones carry `aria-hidden`.
- Peter clicks through every changed page locally before any prod deploy.

## 9. Open questions

1. Structure not skin: yes / no.
2. Video: Impact Lab 02 confirmed? Shape (a) hero + (b) reel block: yes / no.
3. Content inputs: who supplies photos and team roster, and by when?
