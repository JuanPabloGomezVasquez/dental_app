import type { NextRequest } from "next/server"
import { verifySession } from "@/lib/dal"
import { getAccessibleModules, assertModuleAccess, AppModule } from "@/lib/modules"
import { appointmentsService } from "@/lib/services/appointments.service"
import { handleApiError } from "@/lib/errors"

export async function GET(request: NextRequest): Promise<Response> {
  const session = await verifySession()
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId)
  assertModuleAccess(accessible, AppModule.APPOINTMENTS)

  const { searchParams } = request.nextUrl
  const doctorId = searchParams.get("doctorId")
  const date = searchParams.get("date")

  if (!doctorId || !date) {
    return Response.json(
      { error: "Los parámetros doctorId y date son requeridos" },
      { status: 400 }
    )
  }

  try {
    const slots = await appointmentsService.getAvailableSlots(doctorId, date)
    return Response.json(slots)
  } catch (error) {
    return handleApiError(error)
  }
}
