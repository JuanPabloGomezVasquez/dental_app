import { verifySession } from "@/lib/dal";
import { createAgentStream } from "@/lib/services/ai-agent.service";
import type { ChatMessage, ToolCall } from "@/lib/integrations/anthropic/types";

type ChatRequestBody = {
  messages: ChatMessage[];
  confirmedToolCall?: ToolCall;
};

export async function POST(req: Request): Promise<Response> {
  await verifySession();

  const body = (await req.json()) as ChatRequestBody;

  if (!body.messages || body.messages.length === 0) {
    return Response.json({ error: "messages es requerido" }, { status: 400 });
  }

  const stream = createAgentStream({
    messages: body.messages,
    confirmedToolCall: body.confirmedToolCall,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
