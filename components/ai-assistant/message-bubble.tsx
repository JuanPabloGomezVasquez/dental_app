"use client";

import type { ChatMessage } from "@/lib/integrations/anthropic/types";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap break-words ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-900"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

interface StreamingBubbleProps {
  text: string;
  isTyping: boolean;
}

export function StreamingBubble({ text, isTyping }: StreamingBubbleProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[75%] rounded-lg px-4 py-2 text-sm bg-gray-100 text-gray-900 whitespace-pre-wrap break-words">
        {isTyping && !text ? (
          <span className="text-gray-400 italic">Asistente está escribiendo...</span>
        ) : (
          text
        )}
      </div>
    </div>
  );
}
