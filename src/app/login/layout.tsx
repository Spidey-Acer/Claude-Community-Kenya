import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Sign in | Claude Community Kenya",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#141413",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
