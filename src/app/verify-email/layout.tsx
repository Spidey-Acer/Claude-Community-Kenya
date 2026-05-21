import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify email | Claude Community Kenya",
  robots: { index: false, follow: false },
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
