import { verifySession } from "@/lib/dal"
import { getAccessibleModules, requireModuleAccess, AppModule } from "@/lib/modules"
import { appointmentsService } from "@/lib/services/appointments.service"
import { AppointmentsPageClient } from "@/components/appointments/appointments-page-client"

function getWeekRange(): { start: Date; end: Date } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + daysToMonday)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  return { start: weekStart, end: weekEnd }
}

export default async function AppointmentsPage() {
  const session = await verifySession()
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId)
  requireModuleAccess(accessible, AppModule.APPOINTMENTS)

  const { start, end } = getWeekRange()
  const appointments = await appointmentsService.listByDateRange(
    start,
    end,
    session.organizationId,
    session.role,
    session.doctorId
  )

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AppointmentsPageClient
        initialAppointments={appointments}
        initialRange={{ start: start.toISOString(), end: end.toISOString() }}
      />
    </div>
  )
}

