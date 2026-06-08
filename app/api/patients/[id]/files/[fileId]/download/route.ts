import type { NextRequest } from "next/server";
import { head } from "@vercel/blob";
import { verifySession } from "@/lib/dal";
import { getAccessibleModules, assertModuleAccess, AppModule } from "@/lib/modules";
import { clinicalHistoryService } from "@/lib/services/clinical-history.service";
import { handleApiError } from "@/lib/errors";

type Params = Promise<{ id: string; fileId: string }>;

export async function GET(
  _req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  const session = await verifySession();
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId);
  assertModuleAccess(accessible, AppModule.PATIENTS);
  const { id, fileId } = await ctx.params;

  try {
    const file = await clinicalHistoryService.getFile(id, fileId);
    const meta = await head(file.url);
    if (!meta) {
      return Response.json({ error: "Archivo no encontrado en almacenamiento" }, { status: 404 });
    }
    return Response.redirect(meta.downloadUrl, 302);
  } catch (error) {
    return handleApiError(error);
  }
}
