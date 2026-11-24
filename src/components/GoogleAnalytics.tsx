"use client";

import { useEffect } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { isAnalyticsDisabled } from "@/lib/attending/attending-path";

const GA_MEASUREMENT_ID = "G-R9WFNC5WQS";

export function GoogleAnalytics() {
  // The attending-card page promises the photo and email go nowhere: no analytics there.
  const pathname = usePathname();
  const disabled = isAnalyticsDisabled(pathname);

  // A gtag loaded by an earlier page lives on in this document; the GA opt-out flag stops it.
  useEffect(() => {
    (window as unknown as Record<string, boolean>)[`ga-disable-${GA_MEASUREMENT_ID}`] = disabled;
  }, [disabled]);

  if (disabled) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
