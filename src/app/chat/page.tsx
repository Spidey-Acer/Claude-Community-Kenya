"use client";

import { usePersona } from "@/contexts/PersonaContext";
import { cn } from "@/lib/utils";
import { ChatPanel } from "@/components/chat/ChatPanel";

export default function ChatPage() {
  const { persona } = usePersona();
  const isDev = persona === "dev";

  return (
    <main className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-6">
      <div className="mb-4">
        <h1
          className={cn(
            "text-xl font-bold",
            isDev ? "font-mono text-green-primary" : "text-text-primary"
          )}
        >
          {isDev ? (
            ">_ chat --community"
          ) : (
            <span className="flex items-center gap-1.5">
              <span
                className="bg-gradient-to-r from-[#d97757] via-[#e8956f] to-[#d97757] bg-[length:200%_auto] bg-clip-text text-transparent"
                style={{ animation: "gradient-shift 3s ease infinite" }}
              >
                Claude Community
              </span>
              <span className="kenya-flame-container">
                <img
                  src="/images/KENYA-FLAME.png"
                  alt="Kenya"
                  className="inline-block h-5 w-auto object-contain"
                  style={{ animation: "kenya-flame-glow 3s ease-in-out infinite, kenya-flame-sway 4s ease-in-out infinite" }}
                />
              </span>
              <span className="text-text-secondary font-normal">Chat</span>
            </span>
          )}
        </h1>
        <p
          className={cn(
            "mt-1 text-sm",
            isDev ? "font-mono text-green-dim" : "text-text-secondary"
          )}
        >
          {isDev
            ? "// ask about events, resources, membership, or anything Claude"
            : "Ask about events, resources, membership, or anything Claude"}
        </p>
      </div>
      <div
        className={cn(
          "flex-1 overflow-hidden",
          isDev
            ? "rounded border border-green-primary/20 bg-bg-primary"
            : "rounded-2xl border border-border-default bg-bg-primary/95 backdrop-blur-md shadow-lg"
        )}
      >
        <ChatPanel tall />
      </div>
    </main>
  );
}
