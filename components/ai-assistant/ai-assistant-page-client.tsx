"use client";

import { useState, useRef } from "react";
import type { PendingConfirmation } from "@/lib/integrations/anthropic/types";
import { ChatWindow, type ChatWindowHandle } from "@/components/ai-assistant/chat-window";
import { ToolConfirmModal } from "@/components/ai-assistant/tool-confirm-modal";
import { TokenBar } from "@/components/ai-assistant/token-bar";

export function AiAssistantPageClient() {
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [tokenUsage, setTokenUsage] = useState({ used: 0 });
  const chatRef = useRef<ChatWindowHandle>(null);

  function handleConfirmationRequired(confirmation: PendingConfirmation) {
    setPendingConfirmation(confirmation);
  }

  function handleTokenUpdate(inputTokens: number, outputTokens: number) {
    setTokenUsage((prev) => ({ used: prev.used + inputTokens + outputTokens }));
  }

  function handleConfirm() {
    if (!pendingConfirmation) return;
    const toolCall = pendingConfirmation.toolCall;
    setPendingConfirmation(null);
    chatRef.current?.confirmTool(toolCall);
  }

  function handleCancel() {
    setPendingConfirmation(null);
    chatRef.current?.cancelTool();
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <ChatWindow
        ref={chatRef}
        onConfirmationRequired={handleConfirmationRequired}
        onTokenUpdate={handleTokenUpdate}
      />
      <TokenBar used={tokenUsage.used} />
      <ToolConfirmModal
        confirmation={pendingConfirmation}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
