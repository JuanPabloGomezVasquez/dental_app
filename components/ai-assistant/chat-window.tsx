"use client";

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { toast } from "sonner";
import type { ChatMessage, PendingConfirmation, StreamEvent, ToolCall } from "@/lib/integrations/anthropic/types";
import { MessageBubble, StreamingBubble } from "@/components/ai-assistant/message-bubble";
import { ChatInput } from "@/components/ai-assistant/chat-input";

export type ChatWindowHandle = {
  confirmTool: (toolCall: ToolCall) => void;
  cancelTool: () => void;
};

interface ChatWindowProps {
  onConfirmationRequired: (confirmation: PendingConfirmation) => void;
  onTokenUpdate: (inputTokens: number, outputTokens: number) => void;
}

export const ChatWindow = forwardRef<ChatWindowHandle, ChatWindowProps>(
  function ChatWindow({ onConfirmationRequired, onTokenUpdate }, ref) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [streamingText, setStreamingText] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const pendingToolCallRef = useRef<ToolCall | null>(null);

    useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamingText]);

    useImperativeHandle(ref, () => ({
      confirmTool(toolCall: ToolCall) {
        pendingToolCallRef.current = null;
        sendToApi(messages, toolCall);
      },
      cancelTool() {
        pendingToolCallRef.current = null;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Acción cancelada por el usuario." },
        ]);
      },
    }));

    async function sendToApi(currentMessages: ChatMessage[], confirmedToolCall?: ToolCall) {
      setIsStreaming(true);
      setStreamingText("");

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: currentMessages, confirmedToolCall }),
        });

        if (!res.ok || !res.body) {
          toast.error("Error al conectar con el asistente");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            const event = JSON.parse(raw) as StreamEvent;

            if (event.type === "text_delta") {
              accumulated += event.text;
              setStreamingText(accumulated);
            } else if (event.type === "tool_confirmation_required") {
              pendingToolCallRef.current = event.confirmation.toolCall;
              onConfirmationRequired(event.confirmation);
            } else if (event.type === "token_update") {
              onTokenUpdate(event.inputTokens, event.outputTokens);
            } else if (event.type === "done") {
              if (accumulated) {
                setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
                setStreamingText("");
              }
            } else if (event.type === "error") {
              toast.error(event.message);
            }
          }
        }
      } catch {
        toast.error("Error de conexión con el asistente");
      } finally {
        setIsStreaming(false);
        setStreamingText("");
      }
    }

    function handleSend(text: string) {
      const updated: ChatMessage[] = [...messages, { role: "user", content: text }];
      setMessages(updated);
      sendToApi(updated);
    }

    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}
          {isStreaming && <StreamingBubble text={streamingText} isTyping={isStreaming} />}
          <div ref={bottomRef} />
        </div>
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </div>
    );
  }
);
