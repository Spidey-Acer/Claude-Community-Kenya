/**
 * The pre-tenancy fallback cohort. Every "which event?" question is now
 * answered from the Event table (src/lib/impact-lab/event-store.ts); this
 * slug remains only as the degrade target for an environment whose tenancy
 * migration has not run yet.
 */
export const DEFAULT_COHORT = "impact-lab-2026-07"
