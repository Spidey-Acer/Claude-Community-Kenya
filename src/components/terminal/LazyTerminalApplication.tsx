"use client";

import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { buildPrefillFromParams } from "@/lib/karibu/form-prefill";

const TerminalApplication = dynamic(
  () => import("@/components/terminal/TerminalApplication").then((mod) => ({ default: mod.TerminalApplication })),
  { ssr: false }
);

/**
 * Lazy-loaded wrapper that reads Karibu query params (?from=karibu&...)
 * and passes a prefill map to TerminalApplication so returning visitors
 * from the Karibu onboarding modal skip past steps they already answered.
 */
export function LazyTerminalApplication() {
  const searchParams = useSearchParams();
  const prefill = buildPrefillFromParams(searchParams);
  return <TerminalApplication prefill={prefill ?? undefined} />;
}
