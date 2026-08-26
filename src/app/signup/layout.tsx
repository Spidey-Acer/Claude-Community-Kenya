import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#141413",
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
