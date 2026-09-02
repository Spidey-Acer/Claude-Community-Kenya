"use client";

import { useRef } from "react";
import type { JudgingCriterion } from "@/lib/impact-lab/judging";
import { FOCUS_RING } from "./judge-ui";

/**
 * One criterion, scored with thumb-sized buttons.
 *
 * A real radio group rather than a row of toggle buttons: a judge scoring
 * thirty-six teams on five criteria makes 180 selections, and the arrow keys
 * are the difference between that being a form and being a chore on a laptop.
 * Roving tabindex, so Tab moves between criteria and the arrows move within
 * one — the pattern a screen reader user expects from a radio group.
 */

/** Every selectable value for one criterion, built from its own min/max. */
function scaleFor(criterion: JudgingCriterion): number[] {
  return Array.from(
    { length: criterion.max - criterion.min + 1 },
    (_, index) => criterion.min + index
  );
}

/**
 * A 1–5 scale fits one row. A 1–10 scale does not — capping at five columns
 * wraps it into two rows of thumb-sized buttons instead of overflowing a phone
 * screen sideways.
 */
function gridColsClass(criterion: JudgingCriterion): string {
  return criterion.max - criterion.min + 1 <= 4 ? "grid-cols-4" : "grid-cols-5";
}

/** The line under the buttons: what the chosen score means, or the two poles. */
function anchorLine(
  criterion: JudgingCriterion,
  value: number | undefined,
  scoreLabels: Readonly<Record<number, string>> | null | undefined
): string {
  // No anchors on a scale too long to anchor per value (Afretec's 1–10): the
  // guidance above is the only calibration, and inventing a "1 = … · 10 = …"
  // string would describe something the rubric never said.
  if (!scoreLabels) return "";
  if (typeof value === "number" && scoreLabels[value]) return scoreLabels[value];
  return `${criterion.min} = ${scoreLabels[criterion.min]} · ${criterion.max} = ${
    scoreLabels[criterion.max]
  }`;
}

export function CriterionRadioGroup({
  criterion,
  value,
  scoreLabels,
  onChange,
}: {
  criterion: JudgingCriterion;
  /** The judge's current score, or undefined when they have not chosen yet. */
  value: number | undefined;
  /** Anchor text per value, or null when the rubric does not anchor its scale. */
  scoreLabels: Readonly<Record<number, string>> | null | undefined;
  onChange: (value: number) => void;
}) {
  const scale = scaleFor(criterion);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const labelId = `criterion-${criterion.key}-label`;
  const guidanceId = `criterion-${criterion.key}-guidance`;

  /** Arrow keys move the selection AND the focus, per the radiogroup pattern. */
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const current = typeof value === "number" ? scale.indexOf(value) : -1;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = current < 0 ? 0 : Math.min(scale.length - 1, current + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = current < 0 ? scale.length - 1 : Math.max(0, current - 1);
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = scale.length - 1;
    }
    if (next === null) return;
    event.preventDefault();
    onChange(scale[next]);
    buttonRefs.current[next]?.focus();
  }

  const anchor = anchorLine(criterion, value, scoreLabels);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span id={labelId} className="font-mono text-sm font-bold text-text-primary">
          {criterion.label}
        </span>
        <span className="shrink-0 font-mono text-xs uppercase tracking-wider text-green-primary">
          {criterion.weight} pts
        </span>
      </div>

      {criterion.guidance && (
        <p id={guidanceId} className="mt-1 text-sm leading-relaxed text-text-dim">
          {criterion.guidance}
        </p>
      )}

      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={criterion.guidance ? guidanceId : undefined}
        onKeyDown={onKeyDown}
        className={`mt-3 grid ${gridColsClass(criterion)} gap-2`}
      >
        {scale.map((option, index) => {
          const active = value === option;
          // Roving tabindex: exactly one button in the group is tabbable — the
          // selected one, or the first when nothing is selected yet.
          const tabbable = active || (typeof value !== "number" && index === 0);
          return (
            <button
              key={option}
              ref={(node) => {
                buttonRefs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={tabbable ? 0 : -1}
              onClick={() => onChange(option)}
              aria-label={
                scoreLabels?.[option]
                  ? `${criterion.label}: ${option} — ${scoreLabels[option]}`
                  : `${criterion.label}: ${option} of ${criterion.max}`
              }
              className={`min-h-12 ${FOCUS_RING} rounded-lg border font-mono text-lg transition-colors ${
                active
                  ? "border-green-primary bg-green-primary text-bg-primary"
                  : "border-border-default bg-bg-primary text-text-secondary hover:border-green-primary/40"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {anchor && <p className="mt-2 text-sm text-text-dim">{anchor}</p>}
    </div>
  );
}
