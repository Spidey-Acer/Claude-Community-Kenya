import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Sign in | Claude Community Kenya",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4EEE3" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1714" },
  ],
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
