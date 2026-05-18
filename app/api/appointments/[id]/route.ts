import type { NextRequest } from "next/server"
import { verifySession } from "@/lib/dal"
import { getAccessibleModules, assertModuleAccess, AppModule } from "@/lib/modules"
import { appointmentsService } from "@/lib/services/appointments.service"
import { handleApiError } from "@/lib/errors"

type Params = Promise<{ id: string }>

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  const session = await verifySession()
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId)
  assertModuleAccess(accessible, AppModule.APPOINTMENTS)
  const { id } = await ctx.params

  try {
    await appointmentsService.cancel(id, session.organizationId)
    return new Response(null, { status: 204 })
  } catch (error) {
    return handleApiError(error)
  }
}
