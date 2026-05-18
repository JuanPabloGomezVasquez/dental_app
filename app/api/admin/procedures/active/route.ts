import { verifySession } from "@/lib/dal";
import { proceduresService } from "@/lib/services/procedures.service";

export async function GET(): Promise<Response> {
  const session = await verifySession();

  const procedures = await proceduresService.list({ organizationId: session.organizationId, active: true });
  const dto = procedures.map(({ id, name }) => ({ id, name }));
  return Response.json(dto);
}
