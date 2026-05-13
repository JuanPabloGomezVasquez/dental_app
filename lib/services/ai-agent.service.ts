import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/lib/integrations/anthropic/client";
import { buildSystemPrompt } from "@/lib/integrations/anthropic/system-prompt";
import { READ_TOOLS } from "@/lib/integrations/anthropic/tools/read-tools";
import { WRITE_TOOLS } from "@/lib/integrations/anthropic/tools/write-tools";
import type { ChatMessage, StreamEvent, ToolCall } from "@/lib/integrations/anthropic/types";

export type AgentStreamInput = {
  messages: ChatMessage[];
  confirmedToolCall?: ToolCall;
};

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;
const MAX_LOOP_ITERATIONS = 10;

export function createAgentStream(input: AgentStreamInput): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function emit(event: StreamEvent): void {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        let messages: Anthropic.MessageParam[] = input.messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        if (input.confirmedToolCall) {
          const { toolName, toolInput, toolUseId } = input.confirmedToolCall;
          const writeTool = WRITE_TOOLS.find((t) => t.definition.name === toolName);
          const result = writeTool
            ? await writeTool.execute(toolInput)
            : JSON.stringify({ error: "Tool desconocida" });

          emit({ type: "tool_result", toolName, result });

          messages = [
            ...messages,
            {
              role: "assistant",
              content: [{ type: "tool_use", id: toolUseId, name: toolName, input: toolInput }],
            },
            {
              role: "user",
              content: [{ type: "tool_result", tool_use_id: toolUseId, content: result }],
            },
          ];
        }

        const tokens = { input: 0, output: 0 };
        await runLoop(messages, emit, tokens, 0);
        emit({ type: "token_update", inputTokens: tokens.input, outputTokens: tokens.output });
        emit({ type: "done" });
      } catch (err) {
        emit({ type: "error", message: err instanceof Error ? err.message : "Error interno del asistente" });
      } finally {
        controller.close();
      }
    },
  });
}

async function runLoop(
  messages: Anthropic.MessageParam[],
  emit: (event: StreamEvent) => void,
  tokens: { input: number; output: number },
  iteration: number
): Promise<void> {
  if (iteration >= MAX_LOOP_ITERATIONS) {
    emit({ type: "text_delta", text: "\n[Límite de ciclos de herramientas alcanzado]" });
    return;
  }

  const allTools = [...READ_TOOLS, ...WRITE_TOOLS];
  const writeToolMap = new Map(WRITE_TOOLS.map((t) => [t.definition.name, t]));
  const readToolMap = new Map(READ_TOOLS.map((t) => [t.definition.name, t]));

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(),
    tools: allTools.map((t) => t.definition),
    messages,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      emit({ type: "text_delta", text: event.delta.text });
    }
  }

  const final = await stream.finalMessage();
  tokens.input += final.usage.input_tokens;
  tokens.output += final.usage.output_tokens;

  if (final.stop_reason !== "tool_use") return;

  const toolResultBlocks: Anthropic.ToolResultBlockParam[] = [];

  for (const block of final.content) {
    if (block.type !== "tool_use") continue;

    const writeTool = writeToolMap.get(block.name);
    if (writeTool) {
      emit({
        type: "tool_confirmation_required",
        confirmation: {
          toolCall: {
            toolName: block.name,
            toolInput: block.input as Record<string, unknown>,
            toolUseId: block.id,
          },
          description: writeTool.describeAction(block.input as Record<string, unknown>),
        },
      });
      return;
    }

    const readTool = readToolMap.get(block.name);
    if (readTool) {
      const result = await readTool.execute(block.input as Record<string, unknown>);
      emit({ type: "tool_result", toolName: block.name, result });
      toolResultBlocks.push({ type: "tool_result", tool_use_id: block.id, content: result });
    }
  }

  if (toolResultBlocks.length === 0) return;

  await runLoop(
    [
      ...messages,
      { role: "assistant", content: final.content as Anthropic.MessageParam["content"] },
      { role: "user", content: toolResultBlocks },
    ],
    emit,
    tokens,
    iteration + 1
  );
}
