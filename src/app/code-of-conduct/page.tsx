import type { Metadata } from "next";
import { CodeOfConductContent } from "./CodeOfConductContent";

export const metadata: Metadata = {
  title: "Code of Conduct | Claude Community Kenya",
  description:
    "Our community code of conduct — ensuring a welcoming, inclusive, and harassment-free experience for everyone.",
  openGraph: {
    title: "Code of Conduct | Claude Community Kenya",
    description:
      "Our community code of conduct — ensuring a welcoming, inclusive, and harassment-free experience for everyone.",
    url: "https://www.claudekenya.org/code-of-conduct",
    siteName: "Claude Community Kenya",
    type: "website",
  },
};

export default function CodeOfConductPage() {
  return (
    <main className="min-h-screen bg-bg-primary">
      <CodeOfConductContent />
    </main>
  );
}
