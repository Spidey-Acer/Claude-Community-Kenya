/**
 * EmptyState: the designed "nothing here yet" card. A title, one line of body
 * copy, and an optional action (a link or button the caller supplies).
 */

import type { ReactNode } from "react";
import { H2 } from "./tokens";

interface EmptyStateProps {
  title: ReactNode;
  body: string;
  action?: ReactNode;
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-sand bg-paper-card p-8 sm:p-10">
      <h3 className={`${H2} mb-3 text-[26px] sm:text-[30px]`}>{title}</h3>
      <p className="mb-6 max-w-[520px] font-inter text-[15px] leading-[1.6] text-ink-soft">{body}</p>
      {action && <div className="flex flex-wrap gap-3">{action}</div>}
    </div>
  );
}
