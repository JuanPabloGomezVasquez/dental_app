import { verifySession } from "@/lib/dal";
import { patientsService } from "@/lib/services/patients.service";
import { handleApiError, NotFoundError } from "@/lib/errors";

type Params = Promise<{ id: string }>;

export async function POST(_req: Request, ctx: { params: Params }): Promise<Response> {
  await verifySession();
  const { id } = await ctx.params;

  try {
    await patientsService.anonymize(id);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return Response.json({ error: "Paciente no encontrado" }, { status: 404 });
    }
    return handleApiError(error);
  }
}
