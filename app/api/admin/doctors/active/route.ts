import { verifySession } from "@/lib/dal";
import { doctorsService } from "@/lib/services/doctors.service";

export async function GET(): Promise<Response> {
  await verifySession();

  const doctors = await doctorsService.list({ active: true });
  const dto = doctors.map(({ id, name }) => ({ id, name }));
  return Response.json(dto);
}
