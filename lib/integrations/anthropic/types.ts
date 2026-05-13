export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ToolCall = {
  toolName: string;
  toolInput: Record<string, unknown>;
  toolUseId: string;
};

export type PendingConfirmation = {
  toolCall: ToolCall;
  description: string;
};

export type StreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_confirmation_required"; confirmation: PendingConfirmation }
  | { type: "tool_result"; toolName: string; result: string }
  | { type: "token_update"; inputTokens: number; outputTokens: number }
  | { type: "done" }
  | { type: "error"; message: string };
