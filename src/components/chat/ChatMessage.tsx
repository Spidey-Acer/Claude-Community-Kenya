"use client";

import type { ReactNode } from "react";
import { useSkin } from "@/contexts/SkinContext";
import { cn } from "@/lib/utils";
import { parseActions } from "@/lib/chat/action-parser";
import { ActionButton } from "./ActionButton";
import { motion } from "framer-motion";
import type { UIMessage } from "ai";

/** Render inline markdown: **bold**, *italic*, `code` */
function renderInlineMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // Match **bold**, *italic*, `code`
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      parts.push(<strong key={match.index} className="font-semibold">{match[1]}</strong>);
    } else if (match[2]) {
      parts.push(<em key={match.index}>{match[2]}</em>);
    } else if (match[3]) {
      parts.push(
        <code key={match.index} className="rounded bg-bg-secondary px-1 py-0.5 text-xs font-mono">
          {match[3]}
        </code>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function ChatMessage({ message }: { message: UIMessage }) {
  const { skin } = useSkin();
  const isUser = message.role === "user";
  const isDev = skin === "dev";

  // Extract text from parts
  const textContent = message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");

  const { text, actions } = isUser
    ? { text: textContent, actions: [] }
    : parseActions(textContent);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
          isUser && isDev &&
            "bg-green-muted/50 text-green-primary font-mono border border-green-primary/20",
          isUser && !isDev &&
            "bg-[#d97757]/15 text-text-primary",
          !isUser && isDev &&
            "bg-bg-card text-amber font-mono border border-border-default",
          !isUser && !isDev &&
            "bg-bg-elevated/80 text-text-primary backdrop-blur-sm border border-border-default/50"
        )}
      >
        <p className="whitespace-pre-wrap break-words">{renderInlineMarkdown(text)}</p>
        {actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {actions.map((action, i) => (
              <ActionButton key={i} action={action} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
