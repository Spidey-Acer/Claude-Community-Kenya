"use client";

import dynamic from "next/dynamic";

const TerminalApplication = dynamic(
  () => import("@/components/terminal/TerminalApplication").then((mod) => ({ default: mod.TerminalApplication })),
  { ssr: false }
);

export function LazyTerminalApplication() {
  return <TerminalApplication />;
}
