"use client";

import { useCallback, useState } from "react";
import { useKonamiCode } from "@/hooks/useKonamiCode";
import { KonamiOverlay } from "@/components/KonamiOverlay";
import { ConsoleWelcome } from "@/components/ConsoleWelcome";

export function EasterEggs() {
  const [konamiActive, setKonamiActive] = useState(false);

  const activateKonami = useCallback(() => {
    setKonamiActive(true);
  }, []);

  useKonamiCode(activateKonami);

  return (
    <>
      <ConsoleWelcome />
      <KonamiOverlay
        visible={konamiActive}
        onClose={() => setKonamiActive(false)}
      />
    </>
  );
}
