"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { KaribuChips } from "./KaribuChips";
import { KaribuFallbackWizard } from "./KaribuFallbackWizard";

interface ChipSet {
  forMessageIndex: number;
  options: Array<{ label: string; value: string }>;
}

const TURN_CHIPS: ChipSet[] = [
  {
    forMessageIndex: 0, // chips after Claude's first greeting
    options: [
      { label: "I write code", value: "I'm a developer" },
      { label: "I use Claude for work", value: "I'm a non-technical professional" },
      { label: "I'm a student", value: "I'm a student" },
      { label: "I'm a founder", value: "I'm a founder" },
      { label: "Just curious", value: "I'm just exploring" },
    ],
  },
];

/**
 * Renders the Karibu onboarding chat thread. Wraps the existing ChatMessage,
 * ChatInput, and TypingIndicator components. Drives the conversation via
 * ai-sdk's useChat hook pointed at /api/karibu.
 *
 * Calls `onComplete` shortly after Claude calls the record_visitor tool,
 * which signals onboarding is done and triggers the modal exit.
 */
export function KaribuConversation({ onComplete }: { onComplete: () => void }) {
  const transport = useRef(
    new DefaultChatTransport({ api: "/api/karibu" })
  ).current;

  const [inputValue, setInputValue] = useState("");

  const { messages, sendMessage, status } = useChat({
    transport,
    onFinish: ({ message }: { message: UIMessage }) => {
      const toolCalled = message.parts?.some(
        (p) =>
          typeof p.type === "string" &&
          p.type.startsWith("tool-record_visitor") &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((p as any).state === "output-available" || (p as any).state === "result"),
      );
      if (toolCalled) {
        setTimeout(onComplete, 600);
      }
    },
  });

  const errored = status === "error";
  const isStreaming = status === "submitted" || status === "streaming";

  // Count assistant messages to determine chip set
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const lastAssistantIdx = assistantMessages.length - 1;
  const showChipsForIdx = !isStreaming ? lastAssistantIdx : -1;
  const chips = TURN_CHIPS.find((c) => c.forMessageIndex === showChipsForIdx);

  // Send a trivial opening message so Claude greets first
  useEffect(() => {
    if (messages.length === 0) {
      sendMessage({ text: "hello" });
    }
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

  if (errored) {
    return <KaribuFallbackWizard onComplete={onComplete} />;
  }

  return (
    <div
      className="flex flex-col gap-3"
      aria-live="polite"
      aria-atomic="false"
    >
      {/* slice(1) hides the auto-sent "hello" opening message */}
      {messages.slice(1).map((m) => (
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

      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        disabled={isStreaming}
      />
    </div>
  );
}
