/**
 * Attaches Conversations Live data to the two events that already exist:
 * - "Nairobi | Claude Conversations" (Sat 29 Aug 2026) gets a ConversationsPage,
 *   seeded from events/2026-08-29-kenya-research-brief.md.
 * - "Nairobi | Claude Impact Lab - AI Mashinani 02" (Wed 2 Sept 2026) gets an
 *   open EventQuestionSession, "Ask Anthropic's team".
 *
 * Idempotent by lookup, never by guess: both events are found by exact title
 * match (per docs/superpowers/specs/2026-08-28-conversations-live-design.md
 * rollout note — they already exist as Event rows, this script never creates
 * an Event). The EventQuestionSession is matched by eventId alone, not
 * title — a rename from the admin must not cause a re-run to create a
 * second open session. Re-running after Saturday must not undo what
 * happened at the venue, so the update branches are narrow on purpose:
 * - ConversationsPage update only touches content fields (hero/stats/table
 *   questions/seed problems) — never `contributionsOpen`, never `result`.
 *   Both are room decisions made from the phone at the venue.
 * - EventQuestionSession update only touches title/prompt — never `isOpen`.
 *   If Peter closes the session after the Q&A, a re-run must not reopen it.
 *
 * Run with:
 *   npx tsx scripts/seed-conversations-29aug.ts
 * (DATABASE_URL must be set in the environment, same as every other script
 * in this directory — see scripts/seed-events.ts.)
 */
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const CONVERSATIONS_EVENT_TITLE = "Nairobi | Claude Conversations"
const IMPACT_LAB_EVENT_TITLE = "Nairobi | Claude Impact Lab - AI Mashinani 02"
const QUESTION_SESSION_TITLE = "Ask Anthropic's team"
const QUESTION_SESSION_PROMPT =
  "Anthropic's team is in the room on 2 September. Send a question now and it " +
  "goes straight into the queue for the live Q&A, whether you can make it to " +
  "Nairobi or not."

const HERO_HEADLINE = "More Kenyans use ChatGPT than anyone else on earth."
const HERO_SUBLINE = "And fewer than half of us are online at all."

const FRAMING_STATS = [
  {
    line:
      "More Kenyans use ChatGPT than people in any other country on earth. 42% of us over " +
      "sixteen used it in the last month, ahead of the UAE, ahead of Israel, more than double " +
      "the United States.",
    source: "DataReportal / Meltwater, Global Digital Report, July 2025",
  },
  {
    line:
      "And fewer than half of Kenyans are online at all. In rural Kenya, under half of people " +
      "own a phone. So \"number one in the world at AI\" describes the half of the country " +
      "that can get on the internet.",
    source: "DataReportal Digital 2025 Kenya; CA + KNBS ICT survey 2025",
  },
  {
    line:
      "The people who taught these systems what is safe to show you were paid $1.46 to $3.74 " +
      "an hour, here in Nairobi. The same work in the US paid $21 to $27.",
    source: "Kenya draft AI policy reporting 2026; TIME 2023",
  },
  {
    line:
      "In April this year, Meta ended its content-moderation contract in Nairobi and more than " +
      "a thousand people lost their jobs in one go.",
    source: "Washington Post / AP, 16 Apr 2026",
  },
  {
    line:
      "2.5 million Kenyan jobs are significantly exposed to what generative AI can already do; " +
      "about 400,000 (bookkeepers, payroll clerks, data-entry operators) are in the first line.",
    source: "ODI \"The AI time bomb\", Nov 2025, KNBS microdata",
  },
  {
    line:
      "84% of working Kenyans are in the informal sector, about 18 million people. For five out " +
      "of six of us, \"what does AI mean for my job\" has no payslip in it.",
    source: "KNBS 2026 Economic Survey",
  },
  {
    line:
      "One government agricultural extension officer per 1,000 to 1,500 farmers. The " +
      "recommended ratio is 1 to 400.",
    source: "Kilimo Trust / GFRAS 2025",
  },
  {
    line:
      "One in five hospital claims sent to SHA gets rejected. That is the number behind every " +
      "person at a reception desk with a card that is not working.",
    source: "The Star, 4 Jul 2026",
  },
  {
    line:
      "The average bribe went up 38% in one year, to about KES 6,700. 99% of people who paid " +
      "never reported it.",
    source: "EACC National Ethics and Corruption Survey 2025",
  },
  {
    line:
      "When secondary-school placement moved to an algorithm, 355,000 families appealed in the " +
      "first week; 66,000 were told no.",
    source: "AllAfrica, Dec 2025",
  },
]

const TABLE_QUESTIONS = [
  {
    key: "jobs",
    label: "What does AI mean for my job?",
    description: "From the trader keeping accounts in her head to the graduate whose job hasn't been invented yet.",
  },
  {
    key: "community",
    label: "What is AI doing to me, my kids, my community?",
    description: "The family WhatsApp group, the homework nobody at home can explain, the help that isn't there yet.",
  },
  {
    key: "rules",
    label: "Who decides the rules?",
    description: "The algorithm, the fee, the fine print. Who gets to appeal, and to whom.",
  },
]

const SEED_PROBLEMS = [
  {
    title: "Deni Ya Kichwani",
    statement:
      "I keep my whole business in my head: who took sugar on credit, who pays Friday, what I " +
      "sold today. At month end I cannot tell whether I made a profit or just moved money " +
      "around.",
    questionKey: "jobs",
    buildWedge:
      "Voice-note ledger. Trader sends \"Mama Otieno amechukua sukari, atalipa Ijumaa\"; Claude " +
      "extracts customer, item, amount, due date, keeps a running balance, nudges on the due " +
      "date.",
  },
  {
    title: "Nilisoma, Sasa Nini?",
    statement: "Degree finished, HELB still deducting, the job it was for does not exist.",
    questionKey: "jobs",
    buildWedge:
      "Honest career triage: what you studied plus what you can do, mapped against tasks AI now " +
      "does cheaply versus tasks that need a human present, plus 2 to 3 named next moves and a " +
      "re-pointed CV. Hardcoded list of real local resources so it can never invent a course.",
  },
  {
    title: "Broker Ndio Anaweka Bei",
    statement:
      "The broker at my gate tells me what my tomatoes are worth; I cannot check Nairobi's " +
      "price that morning or hold the crop while I find out.",
    questionKey: "jobs",
    buildWedge:
      "Fair-price line. Text \"nyanya, Kinangop\" and get today's realistic farm-gate range, " +
      "where the number came from, one sentence to say to the broker. Team seeds this week's " +
      "wholesale prices; Claude handles messy crop names in Kikuyu, Dholuo, Sheng.",
  },
  {
    title: "Tuliifundisha, Sasa Inatufuta",
    statement:
      "I labelled data and moderated content in Nairobi for a few dollars an hour; then the " +
      "model got good, the contract ended, a thousand of us went in a week. We built the thing " +
      "now doing the work.",
    questionKey: "jobs",
    buildWedge:
      "Pay-and-rights packet: task type plus hours plus pay, checked against published " +
      "benchmark rates elsewhere, plus a drafted pay-dispute letter for a union or legal-aid " +
      "clinic.",
  },
  {
    title: "Forward Kutoka Kwa Aunty",
    statement:
      "The family group gets a voice note: a cure, a warning, an investment. Forwarded thirty " +
      "times before anyone asks if it is true. I do not want to be the one who argues with my " +
      "aunt.",
    questionKey: "community",
    buildWedge:
      "Forward-checker that replies in the format it received: verdict in Swahili or English " +
      "against a curated source list, plus a polite reply you can forward straight back into " +
      "the group.",
  },
  {
    title: "Bot Haiwezi Sheng",
    statement:
      "I type half Swahili, half English, some Sheng. The AI replies in stiff textbook Swahili " +
      "or misreads half of it. The thing changing the world is not built for people who talk " +
      "like me.",
    questionKey: "community",
    buildWedge:
      "A code-switch eval built in public: 100 builders times 10 real messages each equals a " +
      "1,000-item Kenyan code-switching benchmark plus leaderboard by evening. The crowd is the " +
      "asset.",
  },
  {
    title: "Homework Sielewi",
    statement:
      "My child brings home pathways, strands, competencies. I went through 8-4-4; I cannot " +
      "help, so I nod and pay for tuition I cannot afford.",
    questionKey: "community",
    buildWedge:
      "Photograph the homework, get a plain-Swahili explanation of the skill being tested plus " +
      "three no-materials things to do at the kitchen table tonight. Coaches the parent, never " +
      "solves for the child.",
  },
  {
    title: "Kimya Ya Vijana",
    statement:
      "My cousin struggled for months and nobody knew until it was a crisis. Nowhere private, " +
      "near, or affordable for a nineteen-year-old who is not okay.",
    questionKey: "community",
    buildWedge:
      "A first line, explicitly not a therapist: anonymous chat with psychological-first-aid " +
      "scripting and a hardcoded risk-language escalation that surfaces a real Kenyan hotline. " +
      "The build lesson is deciding what the model must not be trusted with.",
  },
  {
    title: "Kompyuta Ilimpangia Shule",
    statement:
      "A system placed my child hundreds of kilometres away in a pathway she did not choose. " +
      "The appeal was declined and nobody could say on what basis.",
    questionKey: "rules",
    buildWedge:
      "Decision explainer: score, county, and placement walked through the published formula, " +
      "honest odds of appeal, drafted appeal letter and portal steps.",
  },
  {
    title: "Kadi Iko, Cover Haiko",
    statement:
      "Paying SHA every month; at the hospital the cover \"is not showing.\" I borrowed money " +
      "at the reception desk to be admitted.",
    questionKey: "rules",
    buildWedge:
      "Cover checker grounded strictly in the published benefits package; answers only from the " +
      "document, says \"I do not know\" rather than improvising, lists common rejection reasons " +
      "plus appeal steps. Cleanest grounding teaching case in the lab.",
  },
  {
    title: "Kitu Kidogo Bado",
    statement:
      "Birth certificate, ID renewal, a relative in a cell: there is the official fee and then " +
      "the other one. I do not know the real fee, and reporting feels pointless and risky.",
    questionKey: "rules",
    buildWedge:
      "Fee checker that leaves a receipt: describe what you were asked to pay, voice note fine, " +
      "Sheng fine, get the gazetted fee, the gap, and an offered anonymous complaint; every " +
      "check logs to a public tally by service and county.",
  },
  {
    title: "Nilikubali Nini?",
    statement:
      "To get the ID, the service, or the phone loan, I gave fingerprints and clicked accept on " +
      "something I did not read. Who holds it now, and who would I even complain to?",
    questionKey: "rules",
    buildWedge:
      "\"What did I just agree to\": photograph the consent screen, get a plain-language data " +
      "map under Kenya's data protection law, unusual-clause flags, drafted complaint to the " +
      "ODPC.",
  },
]

async function main(): Promise<void> {
  const conversationsEvent = await prisma.event.findFirst({
    where: { title: CONVERSATIONS_EVENT_TITLE },
    select: { id: true, slug: true },
  })
  if (!conversationsEvent) {
    throw new Error(`Event not found: "${CONVERSATIONS_EVENT_TITLE}" — refusing to create it.`)
  }

  const existingPage = await prisma.conversationsPage.findUnique({
    where: { eventId: conversationsEvent.id },
    select: { id: true },
  })
  await prisma.conversationsPage.upsert({
    where: { eventId: conversationsEvent.id },
    create: {
      eventId: conversationsEvent.id,
      heroHeadline: HERO_HEADLINE,
      heroSubline: HERO_SUBLINE,
      framingStats: FRAMING_STATS,
      tableQuestions: TABLE_QUESTIONS,
      seedProblems: SEED_PROBLEMS,
    },
    // Content only. contributionsOpen and result are room decisions made at
    // the venue — a re-run must never touch them.
    update: {
      heroHeadline: HERO_HEADLINE,
      heroSubline: HERO_SUBLINE,
      framingStats: FRAMING_STATS,
      tableQuestions: TABLE_QUESTIONS,
      seedProblems: SEED_PROBLEMS,
    },
  })
  console.log(
    `ConversationsPage for "${conversationsEvent.slug}": ${existingPage ? "updated" : "created"}`
  )

  const impactLabEvent = await prisma.event.findFirst({
    where: { title: IMPACT_LAB_EVENT_TITLE },
    select: { id: true, slug: true },
  })
  if (!impactLabEvent) {
    throw new Error(`Event not found: "${IMPACT_LAB_EVENT_TITLE}" — refusing to create it.`)
  }

  // Matched by eventId alone, never by title: if Peter renames the session
  // from the admin before a re-run, matching on the old title would miss it
  // and create a second open session for the same event.
  const existingSession = await prisma.eventQuestionSession.findFirst({
    where: { eventId: impactLabEvent.id },
    select: { id: true },
  })
  if (existingSession) {
    // title/prompt only — never isOpen. If Peter closed the session after
    // the Q&A ran, a re-run must not reopen it.
    await prisma.eventQuestionSession.update({
      where: { id: existingSession.id },
      data: { prompt: QUESTION_SESSION_PROMPT },
    })
    console.log(`EventQuestionSession for "${impactLabEvent.slug}": updated`)
  } else {
    await prisma.eventQuestionSession.create({
      data: {
        eventId: impactLabEvent.id,
        title: QUESTION_SESSION_TITLE,
        prompt: QUESTION_SESSION_PROMPT,
        isOpen: true,
      },
    })
    console.log(`EventQuestionSession for "${impactLabEvent.slug}": created`)
  }

  console.log("Done.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
