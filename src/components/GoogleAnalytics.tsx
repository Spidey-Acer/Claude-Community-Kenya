"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { isAttendingPath } from "@/lib/attending/attending-path";

const GA_MEASUREMENT_ID = "G-R9WFNC5WQS";

export function GoogleAnalytics() {
  // The attending-card page promises the photo and email go nowhere: no analytics there.
  const pathname = usePathname();
  if (isAttendingPath(pathname)) return null;

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
