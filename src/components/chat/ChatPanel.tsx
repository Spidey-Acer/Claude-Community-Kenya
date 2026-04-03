"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { usePersona } from "@/contexts/PersonaContext";
import { cn } from "@/lib/utils";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { RotateCcw } from "lucide-react";

const STORAGE_KEY = "cck-chat-messages";
const MAX_MESSAGES = 20;

const SUGGESTIONS = [
  "What is Claude Community Kenya?",
  "How do I join?",
  "What events are coming up?",
  "Show me resources",
];

function loadStoredMessages(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

interface ChatPanelProps {
  tall?: boolean;
}

export function ChatPanel({ tall }: ChatPanelProps) {
  const { persona } = usePersona();
  const isDev = persona === "dev";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const storedMessages = useMemo(() => loadStoredMessages(), []);

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ persona: persona ?? "dev" }),
    }),
    messages: storedMessages,
  });

  // Persist messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch {
        // Storage full — ignore
      }
    }
  }, [messages]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || status !== "ready") return;
    sendMessage({ text: trimmed });
    setInput("");
  }, [input, status, sendMessage]);

  const handleSuggestion = useCallback(
    (text: string) => {
      if (status !== "ready") return;
      sendMessage({ text });
    },
    [status, sendMessage]
  );

  const handleReset = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, [setMessages]);

  const isStreaming = status === "submitted" || status === "streaming";
  const showReset = messages.length >= MAX_MESSAGES;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden",
        tall ? "h-full" : "h-full"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between border-b px-3 py-2.5",
          isDev
            ? "border-green-primary/20 bg-bg-secondary"
            : "border-border-default bg-bg-card/80 backdrop-blur-sm"
        )}
      >
        <div className="flex items-center gap-2">
          {isDev ? (
            <span className="font-mono text-xs font-medium text-green-primary">
              &gt;_ cck-bot
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm font-semibold leading-none">
              <img src="/images/claude-sparkle.svg" alt="" className="h-3.5 w-3.5" />
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
                  className="inline-block h-[14px] w-auto object-contain"
                  style={{ animation: "kenya-flame-glow 3s ease-in-out infinite, kenya-flame-sway 4s ease-in-out infinite" }}
                />
              </span>
            </span>
          )}
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px]",
              isDev
                ? "border border-green-primary/30 text-green-dim font-mono"
                : "bg-[#d97757]/10 text-[#d97757]"
            )}
          >
            {isDev ? "DEV" : "PRO"}
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleReset}
            className="text-text-dim hover:text-text-secondary transition-colors"
            aria-label="Reset conversation"
            title="Reset conversation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto p-3"
      >
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-8">
            <p
              className={cn(
                "text-center text-sm",
                isDev ? "font-mono text-green-dim" : "text-text-secondary"
              )}
            >
              {isDev
                ? "// ask me anything about CCK"
                : "Ask me about Claude Community Kenya"}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className={cn(
                    "text-xs transition-colors",
                    isDev
                      ? "border border-border-default px-2 py-1 font-mono text-text-dim hover:border-green-primary/40 hover:text-green-primary"
                      : "rounded-full border border-border-default px-3 py-1.5 text-text-secondary hover:border-[#d97757]/40 hover:text-[#d97757]"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}

        {isStreaming && messages.at(-1)?.role !== "assistant" && (
          <div className="flex justify-start">
            <div
              className={cn(
                "rounded-lg px-3 py-2",
                isDev
                  ? "bg-bg-card border border-border-default"
                  : "bg-bg-elevated/80 backdrop-blur-sm border border-border-default/50"
              )}
            >
              <TypingIndicator />
            </div>
          </div>
        )}

        {showReset && (
          <div className="text-center">
            <button
              onClick={handleReset}
              className={cn(
                "text-xs transition-colors",
                isDev
                  ? "font-mono text-amber hover:text-green-primary"
                  : "text-[#d97757] hover:text-text-primary"
              )}
            >
              {isDev
                ? "[ conversation limit reached — reset ]"
                : "Conversation limit reached. Start fresh?"}
            </button>
          </div>
        )}

        {error && (
          <div
            className={cn(
              "rounded-lg px-3 py-2 text-xs",
              isDev
                ? "border border-red/30 text-red font-mono"
                : "border border-red/20 text-red"
            )}
          >
            {isDev ? "ERR: " : ""}Something went wrong. Please try again.
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={isStreaming || showReset}
      />
    </div>
  );
}
