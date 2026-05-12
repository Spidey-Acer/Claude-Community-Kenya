import { recordVisitorSchema } from "../../src/lib/karibu/tool-schema";

let failed = 0;

function check(name: string, ok: boolean) {
  console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (!ok) failed++;
}

check("minimal valid (audience only)", recordVisitorSchema.safeParse({ audience: "dev" }).success);

check(
  "full valid",
  recordVisitorSchema.safeParse({
    audience: "founder",
    intent: "build",
    experience: "api_builder",
    name: "Mary",
    city: "Nairobi",
    language: "en",
  }).success,
);

check("rejects missing audience", !recordVisitorSchema.safeParse({ intent: "build" }).success);

check("rejects bad audience enum", !recordVisitorSchema.safeParse({ audience: "ceo" }).success);

check(
  "rejects name >80 chars",
  !recordVisitorSchema.safeParse({ audience: "dev", name: "x".repeat(81) }).success,
);

check("rejects bad language", !recordVisitorSchema.safeParse({ audience: "dev", language: "fr" }).success);

console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
