import type { NextRequest } from "next/server"
import { verifySession } from "@/lib/dal"
import { getAccessibleModules, assertModuleAccess, AppModule } from "@/lib/modules"
import { appointmentsService } from "@/lib/services/appointments.service"
import { createAppointmentSchema } from "@/lib/validations/appointment.schema"
import { handleApiError } from "@/lib/errors"

export async function GET(request: NextRequest): Promise<Response> {
  const session = await verifySession()
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId)
  assertModuleAccess(accessible, AppModule.APPOINTMENTS)

  const { searchParams } = request.nextUrl
  const start = searchParams.get("start")
  const end = searchParams.get("end")
  const filterDoctorId = searchParams.get("doctorId") ?? undefined

  if (!start || !end) {
    return Response.json(
      { error: "Los parámetros start y end son requeridos" },
      { status: 400 }
    )
  }

  try {
    const appointments = await appointmentsService.listByDateRange(
      new Date(start),
      new Date(end),
      session.organizationId,
      session.role,
      session.doctorId,
      filterDoctorId
    )
    return Response.json(appointments)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const session = await verifySession()
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId)
  assertModuleAccess(accessible, AppModule.APPOINTMENTS)

  const body: unknown = await request.json()
  const parsed = createAppointmentSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    )
  }

  try {
    const appointment = await appointmentsService.create(parsed.data, session.organizationId)
    return Response.json(appointment, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
