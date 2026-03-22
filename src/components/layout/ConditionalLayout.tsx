"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LoadingBar } from "@/components/terminal/LoadingBar";
import { EasterEggs } from "@/components/EasterEggs";
import { PageTransition } from "@/components/layout/PageTransition";

export function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <a href="#main-content" className="skip-nav">
        Skip to main content
      </a>
      <Navbar />
      <LoadingBar />
      <main id="main-content">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
      <EasterEggs />
    </>
  );
}
