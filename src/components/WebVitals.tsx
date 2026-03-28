"use client";

import { useReportWebVitals } from "next/web-vitals";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function WebVitals() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Web Vital] ${metric.name}: ${metric.value.toFixed(1)}ms (${metric.rating})`);
    }

    // Send to Google Analytics 4
    if (typeof window.gtag === "function") {
      window.gtag("event", metric.name, {
        value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
        event_label: metric.id,
        non_interaction: true,
      });
    }
  });

  return null;
}
