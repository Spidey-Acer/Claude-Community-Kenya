import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat",
  description:
    "Chat with the Claude Community Kenya assistant — ask about events, resources, membership, and more.",
  alternates: {
    canonical: "https://www.claudekenya.org/chat",
  },
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
