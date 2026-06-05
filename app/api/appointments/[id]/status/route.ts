import type { NextRequest } from "next/server"
import { verifySession } from "@/lib/dal"
import { getAccessibleModules, assertModuleAccess, AppModule } from "@/lib/modules"
import { appointmentsService } from "@/lib/services/appointments.service"
import { updateAppointmentStatusSchema } from "@/lib/validations/appointment.schema"
import { handleApiError } from "@/lib/errors"

type Params = Promise<{ id: string }>

export async function PATCH(
  req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  const session = await verifySession()
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId)
  assertModuleAccess(accessible, AppModule.APPOINTMENTS)
  const { id } = await ctx.params

  const body = await req.json()
  const parsed = updateAppointmentStatusSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const apt = await appointmentsService.updateStatus(id, session.organizationId, parsed.data.status)
    return Response.json(apt)
  } catch (error) {
    return handleApiError(error)
  }
}
