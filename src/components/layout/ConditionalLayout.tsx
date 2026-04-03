"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LoadingBar } from "@/components/terminal/LoadingBar";
import { EasterEggs } from "@/components/EasterEggs";
import { PageTransition } from "@/components/layout/PageTransition";
import { PersonaProvider, usePersona } from "@/contexts/PersonaContext";
import { PersonaSelectorModal } from "@/components/persona/PersonaSelectorModal";
import { ChatWidget } from "@/components/chat/ChatWidget";

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
    <PersonaProvider>
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
      <ChatWidget />
      <PersonaGate />
    </PersonaProvider>
  );
}

function PersonaGate() {
  const { persona, setPersona, isLoaded } = usePersona();
  if (!isLoaded || persona !== null) return null;
  return <PersonaSelectorModal onSelect={setPersona} />;
}
