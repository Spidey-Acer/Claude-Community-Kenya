import { describe, expect, it } from "vitest";
import {
  buildBandCopy,
  isWithinRecentWindow,
  shortEventLabel,
  spellNumber,
  weekdayDayMonth,
  type BandCopyInput,
} from "../band-copy";

// A Sunday morning in Nairobi, one day after Build Day.
const NOW = new Date("2026-09-21T06:00:00Z");

// The real admin title: city-namespaced, and it already names the model.
const buildDay = { slug: "nairobi-build-day-2026", title: "Nairobi | Fable 5.1 Build Day", date: "2026-09-20" };
const meetup = { slug: "claude-conversations-nairobi", title: "Nairobi | Claude Conversations", date: "2026-09-12" };
const upcoming = { slug: "mombasa-meetup-october", title: "Mombasa Meetup", date: "2026-10-03" };

function input(overrides: Partial<BandCopyInput>): BandCopyInput {
  return {
    latestPastEvent: null,
    teamsSubmitted: null,
    nextEvent: null,
    citiesActive: ["Nairobi", "Mombasa", "Kisumu"],
    now: NOW,
    ...overrides,
  };
}

describe("spellNumber", () => {
  it("spells out numbers below 21 and keeps larger ones as numerals", () => {
    expect(spellNumber(0)).toBe("zero");
    expect(spellNumber(1)).toBe("one");
    expect(spellNumber(19)).toBe("nineteen");
    expect(spellNumber(20)).toBe("twenty");
    expect(spellNumber(21)).toBe("21");
    expect(spellNumber(140)).toBe("140");
  });

  it("leaves non-integers and negatives alone", () => {
    expect(spellNumber(2.5)).toBe("2.5");
    expect(spellNumber(-3)).toBe("-3");
  });
});

describe("shortEventLabel", () => {
  it("drops the city pipe and a phrase the sentence already used", () => {
    expect(shortEventLabel("Nairobi | Fable 5.1 Build Day", ["Fable 5.1"])).toBe("Nairobi Build Day");
  });

  it("keeps the words after the pipe when nothing was said before", () => {
    expect(shortEventLabel("Nairobi | Claude Conversations")).toBe("Nairobi Claude Conversations");
  });

  it("leaves a title with no pipe alone", () => {
    expect(shortEventLabel("Mombasa Meetup")).toBe("Mombasa Meetup");
    expect(shortEventLabel("Mombasa Meetup", ["Fable 5.1"])).toBe("Mombasa Meetup");
  });

  it("does not repeat the city when the title already does, and matches case-insensitively", () => {
    expect(shortEventLabel("Nairobi | Nairobi Build Day")).toBe("Nairobi Build Day");
    expect(shortEventLabel("Nairobi | FABLE 5.1 Build Day", ["fable 5.1"])).toBe("Nairobi Build Day");
  });

  it("keeps the title rather than emptying it, and squashes stray spacing", () => {
    // Removing the phrase would leave nothing to name the event by.
    expect(shortEventLabel("Nairobi | Fable 5.1", ["Fable 5.1"])).toBe("Nairobi Fable 5.1");
    expect(shortEventLabel("   Nairobi |  Fable 5.1   Build  Day ", ["Fable 5.1"])).toBe("Nairobi Build Day");
    expect(shortEventLabel("   ")).toBe("");
  });
});

describe("weekdayDayMonth", () => {
  it("reads 'Weekday D Month' with no comma and no year", () => {
    expect(weekdayDayMonth("2026-10-03")).toBe("Saturday 3 October");
  });

  it("falls back to the raw string when the date does not parse", () => {
    expect(weekdayDayMonth("soon")).toBe("soon");
  });
});

describe("isWithinRecentWindow", () => {
  it("accepts yesterday, exactly 14 days ago, and today", () => {
    expect(isWithinRecentWindow("2026-09-20", NOW)).toBe(true);
    expect(isWithinRecentWindow("2026-09-07", NOW)).toBe(true);
    expect(isWithinRecentWindow("2026-09-21", NOW)).toBe(true);
  });

  it("rejects 15 days ago, the future, and unparseable dates", () => {
    expect(isWithinRecentWindow("2026-09-06", NOW)).toBe(false);
    expect(isWithinRecentWindow("2026-09-22", NOW)).toBe(false);
    expect(isWithinRecentWindow("last week", NOW)).toBe(false);
  });
});

describe("buildBandCopy", () => {
  it("state 1, Build Day: derives the spelled-out count and links to the winners", () => {
    const copy = buildBandCopy(input({ latestPastEvent: buildDay, teamsSubmitted: 19, nextEvent: upcoming }));
    expect(`${copy.text}${copy.linkText}`).toBe(
      "Nineteen teams shipped overnight on Fable 5.1 at Nairobi Build Day. See the winners →",
    );
    // The model is named once, never twice.
    expect(copy.text.split("Fable 5.1").length - 1).toBe(1);
    expect(copy.href).toBe("/events/nairobi-build-day-2026#results");
  });

  it("state 1, Build Day: a different count changes the number, not the sentence", () => {
    const copy = buildBandCopy(input({ latestPastEvent: buildDay, teamsSubmitted: 23 }));
    expect(copy.text).toBe("23 teams shipped overnight on Fable 5.1 at Nairobi Build Day. ");
  });

  it("state 1, any other event: generic 'teams shipped' sentence with a results link", () => {
    const copy = buildBandCopy(input({ latestPastEvent: meetup, teamsSubmitted: 7 }));
    expect(copy).toEqual({
      text: "Nairobi Claude Conversations: Seven teams shipped. ",
      href: "/events/claude-conversations-nairobi#results",
      linkText: "See the results →",
    });
  });

  it("state 1 without a team count: 'is done' with a what-was-built link", () => {
    for (const teamsSubmitted of [null, 0]) {
      const copy = buildBandCopy(input({ latestPastEvent: buildDay, teamsSubmitted }));
      expect(copy).toEqual({
        text: "Nairobi Fable 5.1 Build Day is done. ",
        href: "/events/nairobi-build-day-2026",
        linkText: "See what was built →",
      });
    }
  });

  it("state 1 wins over state 2 while the event is inside the window", () => {
    const copy = buildBandCopy(input({ latestPastEvent: meetup, teamsSubmitted: null, nextEvent: upcoming }));
    expect(copy.text).toBe("Nairobi Claude Conversations is done. ");
  });

  it("state 2: an event older than 14 days yields to the next event", () => {
    const stale = { ...meetup, date: "2026-09-02" };
    const copy = buildBandCopy(input({ latestPastEvent: stale, teamsSubmitted: 12, nextEvent: upcoming }));
    expect(copy).toEqual({
      text: "Next: Mombasa Meetup, Saturday 3 October. ",
      href: "/events/mombasa-meetup-october",
      linkText: "Save your seat →",
    });
  });

  it("state 3: no live event gives the community line with the active cities and no link", () => {
    const copy = buildBandCopy(input({ citiesActive: ["Nairobi", "Kisumu"] }));
    expect(copy).toEqual({ text: "Kenya's independent Claude builder community. Nairobi, Kisumu." });
  });

  it("state 3 falls back to the three cities when none are configured", () => {
    const copy = buildBandCopy(input({ citiesActive: [] }));
    expect(copy.text).toBe("Kenya's independent Claude builder community. Nairobi, Mombasa, Kisumu.");
  });

  it("never emits an em dash or an arrow outside the link text", () => {
    const cases = [
      input({ latestPastEvent: buildDay, teamsSubmitted: 19 }),
      input({ latestPastEvent: meetup, teamsSubmitted: null }),
      input({ nextEvent: upcoming }),
      input({}),
    ];
    for (const c of cases) {
      const copy = buildBandCopy(c);
      expect(copy.text).not.toContain("2014");
      expect(copy.text).not.toContain("→");
      expect(copy.linkText ?? "").not.toContain("2014");
      expect(copy.href === undefined).toBe(copy.linkText === undefined);
    }
  });
});
