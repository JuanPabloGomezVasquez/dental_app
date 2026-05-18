import { verifySession } from "@/lib/dal";
import { getAccessibleModules, assertModuleAccess, AppModule } from "@/lib/modules";
import { AiAssistantPageClient } from "@/components/ai-assistant/ai-assistant-page-client";

export default async function AiAssistantPage() {
  const session = await verifySession();
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId);
  assertModuleAccess(accessible, AppModule.AI_ASSISTANT);

  return (
    <div className="flex flex-col h-full p-6 max-w-4xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Asistente IA</h1>
      <AiAssistantPageClient />
    </div>
  );
}
