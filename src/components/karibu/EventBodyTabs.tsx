"use client";

/**
 * The event page's body tabs, plus the one piece of client state the server
 * component cannot own: whether the judges panel has anyone in it. The panel
 * is fetched after mount (see KaribuJudgesSection for why), so the Judges
 * tab is offered only once that fetch returns at least one judge. Until then
 * the bar shows About and Winners, and a page left with About alone renders
 * it plain, exactly like an ordinary event.
 */

import { EventTabs, type EventTab } from "@/components/karibu/EventTabs";
import { JudgesPanel, useJudges } from "@/components/karibu/KaribuJudgesSection";

export function EventBodyTabs({
  about,
  winners,
  judgesCohort,
}: {
  about: React.ReactNode;
  winners?: React.ReactNode;
  judgesCohort?: string | null;
}) {
  return judgesCohort ? (
    <WithJudges about={about} winners={winners} cohort={judgesCohort} />
  ) : (
    <Tabs about={about} winners={winners} judges={null} />
  );
}

/** Hooks cannot be conditional, so the cohort-less case skips this wrapper. */
function WithJudges({
  about,
  winners,
  cohort,
}: {
  about: React.ReactNode;
  winners?: React.ReactNode;
  cohort: string;
}) {
  const judges = useJudges(cohort);
  const panel = judges && judges.length > 0 ? <JudgesPanel judges={judges} /> : null;
  return <Tabs about={about} winners={winners} judges={panel} />;
}

function Tabs({
  about,
  winners,
  judges,
}: {
  about: React.ReactNode;
  winners?: React.ReactNode;
  judges: React.ReactNode | null;
}) {
  const tabs: EventTab[] = [{ id: "about", label: "About", children: about }];
  if (winners) tabs.push({ id: "winners", label: "Winners", children: winners });
  if (judges) tabs.push({ id: "judges", label: "Judges", children: judges });
  if (tabs.length === 1) return <>{about}</>;
  return <EventTabs tabs={tabs} defaultId={winners ? "winners" : "about"} />;
}
