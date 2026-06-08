import type { NextRequest } from "next/server";
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

    const blobResponse = await fetch(file.url, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN ?? ""}`,
      },
    });

    if (!blobResponse.ok) {
      return Response.json({ error: "Archivo no disponible en almacenamiento" }, { status: 404 });
    }

    return new Response(blobResponse.body, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
