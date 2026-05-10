import { rank, score, type Recommendable } from "../../src/lib/recommendations";

let failed = 0;
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (!ok) failed++;
};

const events: Recommendable[] = [
  {
    id: "e1",
    type: "event",
    title: "Healthcare AI workshop",
    audiences: ["non_tech_pro"],
    intents: ["learn_basics"],
    city: "Nairobi",
    date: new Date(Date.now() + 7 * 86400_000),
  },
  {
    id: "e2",
    type: "event",
    title: "Founder mixer",
    audiences: ["founder"],
    city: "Nairobi",
    date: new Date(Date.now() + 21 * 86400_000),
  },
  {
    id: "e3",
    type: "event",
    title: "Generic meetup",
    audiences: ["dev", "founder", "non_tech_pro"],
    city: "Mombasa",
    date: new Date(Date.now() + 14 * 86400_000),
    featured: true,
  },
];

const r1 = rank(events, { audience: "non_tech_pro", intent: null, experience: null, city: null });
check("ranks by audience match", r1[0]?.id === "e1");

const r2 = rank(events, {
  audience: "non_tech_pro",
  intent: "learn_basics",
  experience: "never_used",
  city: null,
});
check("intent + experience boosts learn_basics items", r2[0]?.id === "e1");

const r3 = rank(events, { audience: "non_tech_pro", intent: null, experience: null, city: "Nairobi" });
check("city boost wins over featured-elsewhere", r3[0]?.id === "e1");

const r4 = rank(events, { audience: null, intent: null, experience: null, city: null });
check("falls back to featured when audience is null", r4.length === 1 && r4[0].id === "e3");

check(
  "score is non-negative",
  score(events[0], { audience: "dev", intent: null, experience: null, city: null }) >= 0,
);

console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
