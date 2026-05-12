"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { KaribuChips } from "./KaribuChips";
import { KaribuFallbackWizard } from "./KaribuFallbackWizard";
import type { Audience, Intent, Experience } from "@/lib/karibu/types";

interface RecordVisitorArgs {
  audience: Audience;
  intent?: Intent;
  experience?: Experience;
  name?: string;
  city?: string;
  language?: string;
}

interface ChipSet {
  forMessageIndex: number;
  options: Array<{ label: string; value: string }>;
}

const TURN_CHIPS: ChipSet[] = [
  {
    forMessageIndex: 0,
    options: [
      { label: "I write code", value: "I'm a developer" },
      { label: "I use Claude for work", value: "I'm a non-technical professional" },
      { label: "I'm a student", value: "I'm a student" },
      { label: "I'm a founder", value: "I'm a founder" },
      { label: "Just curious", value: "I'm just exploring" },
    ],
  },
  {
    forMessageIndex: 1,
    options: [
      { label: "Learn the basics", value: "I want to learn the basics" },
      { label: "Find an event", value: "I'm looking for an event" },
      { label: "Find collaborators", value: "I want to find collaborators" },
      { label: "Build something", value: "I want to build something" },
    ],
  },
  {
    forMessageIndex: 2,
    options: [
      { label: "Never used Claude", value: "I've never used Claude" },
      { label: "Used Claude.ai", value: "I've used Claude.ai" },
      { label: "Used Claude Code", value: "I've used Claude Code" },
      { label: "Built with the API", value: "I've built with the API" },
    ],
  },
];

const PRIMING_TEXT = "hello";

/**
 * Renders the Karibu onboarding chat thread. Wraps the existing ChatMessage,
 * ChatInput, and TypingIndicator components. Drives the conversation via
 * ai-sdk's useChat hook pointed at /api/karibu.
 *
 * After Claude calls record_visitor, surfaces a "Want to officially join?"
 * step that either deep-links to /join with the captured signals as query
 * params (so the membership form is pre-filled) or dismisses the modal.
 */
export function KaribuConversation({ onComplete }: { onComplete: () => void }) {
  const transport = useRef(
    new DefaultChatTransport({ api: "/api/karibu" })
  ).current;

  const [inputValue, setInputValue] = useState("");
  const [recorded, setRecorded] = useState<RecordVisitorArgs | null>(null);
  const hasPrimedRef = useRef(false);

  const { messages, sendMessage, status } = useChat({
    transport,
    onFinish: ({ message }: { message: UIMessage }) => {
      const toolPart = message.parts?.find(
        (p) =>
          typeof p.type === "string" &&
          p.type.startsWith("tool-record_visitor") &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((p as any).state === "output-available" || (p as any).state === "result"),
      );
      if (toolPart) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const input = (toolPart as any).input as RecordVisitorArgs | undefined;
        if (input?.audience) setRecorded(input);
      }
    },
  });

  const errored = status === "error";
  const isStreaming = status === "submitted" || status === "streaming";

  // Hide the auto-priming "hello" message from the rendered thread
  const visibleMessages = messages.filter((m) => {
    if (m.role !== "user") return true;
    const text =
      m.parts
        ?.map((p) => (p.type === "text" ? p.text : ""))
        .join("")
        .trim()
        .toLowerCase() ?? "";
    return text !== PRIMING_TEXT;
  });

  // Count assistant messages for chip indexing
  const assistantCount = messages.filter((m) => m.role === "assistant").length;
  const showChipsForIdx = !isStreaming && !recorded ? assistantCount - 1 : -1;
  const chips = TURN_CHIPS.find((c) => c.forMessageIndex === showChipsForIdx);

  // Auto-send the priming "hello" exactly once. The ref gate prevents
  // React 19 StrictMode (and any re-render storm) from sending it twice.
  useEffect(() => {
    if (hasPrimedRef.current) return;
    hasPrimedRef.current = true;
    sendMessage({ text: PRIMING_TEXT });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming) return;
    sendMessage({ text: trimmed });
    setInputValue("");
  };

  const handleChipSelect = (value: string) => {
    if (isStreaming) return;
    sendMessage({ text: value });
  };

  const handleJoinYes = () => {
    if (!recorded) return;
    const params = new URLSearchParams({ from: "karibu", audience: recorded.audience });
    if (recorded.intent) params.set("intent", recorded.intent);
    if (recorded.experience) params.set("experience", recorded.experience);
    if (recorded.name) params.set("name", recorded.name);
    if (recorded.city) params.set("city", recorded.city);
    window.location.href = `/join?${params.toString()}`;
  };

  if (errored) {
    return <KaribuFallbackWizard onComplete={onComplete} />;
  }

  return (
    <div
      className="flex flex-col gap-3"
      aria-live="polite"
      aria-atomic="false"
    >
      {visibleMessages.map((m) => (
        <ChatMessage key={m.id} message={m as UIMessage} />
      ))}

      {isStreaming && (
        <div className="flex justify-start">
          <div className="rounded-lg px-3 py-2 bg-bg-card border border-border-default">
            <TypingIndicator />
          </div>
        </div>
      )}

      {chips && (
        <KaribuChips
          options={chips.options}
          disabled={isStreaming}
          onSelect={handleChipSelect}
        />
      )}

      {recorded && !isStreaming && (
        <div className="mt-4 border-t border-border-default pt-4 flex flex-col gap-3">
          <p className="text-text-primary text-sm">
            Want to officially apply to join CCK? Takes ~2 minutes — we&apos;ll
            use what you just told me to pre-fill the form.
          </p>
          <KaribuChips
            options={[
              { label: "Yes, take me there →", value: "join_yes" },
              { label: "Maybe later — show me around", value: "join_later" },
            ]}
            onSelect={(value) => {
              if (value === "join_yes") handleJoinYes();
              else onComplete();
            }}
          />
        </div>
      )}

      {!recorded && (
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          disabled={isStreaming}
        />
      )}
    </div>
  );
}
