import { verifySession } from "@/lib/dal";
import { getAccessibleModules, assertModuleAccess, AppModule } from "@/lib/modules";
import { createAgentStream } from "@/lib/services/ai-agent.service";
import type { ChatMessage, ToolCall } from "@/lib/integrations/anthropic/types";

type ChatRequestBody = {
  messages: ChatMessage[];
  confirmedToolCall?: ToolCall;
};

export async function POST(req: Request): Promise<Response> {
  const session = await verifySession();
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId);
  assertModuleAccess(accessible, AppModule.AI_ASSISTANT);

  const body = (await req.json()) as ChatRequestBody;

  if (!body.messages || body.messages.length === 0) {
    return Response.json({ error: "messages es requerido" }, { status: 400 });
  }

  const stream = createAgentStream({
    messages: body.messages,
    confirmedToolCall: body.confirmedToolCall,
    context: {
      organizationId: session.organizationId,
      callerRole: session.role,
      callerDoctorId: session.doctorId,
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
