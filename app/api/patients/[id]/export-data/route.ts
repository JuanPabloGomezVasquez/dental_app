import { verifySession } from "@/lib/dal";
import { patientsService } from "@/lib/services/patients.service";
import { handleApiError, NotFoundError } from "@/lib/errors";

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, ctx: { params: Params }): Promise<Response> {
  await verifySession();
  const { id } = await ctx.params;

  try {
    const exportData = await patientsService.exportData(id);
    const filename = `datos-paciente-${exportData.patient.idNumber}.json`;
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return Response.json({ error: "Paciente no encontrado" }, { status: 404 });
    }
    return handleApiError(error);
  }
}
