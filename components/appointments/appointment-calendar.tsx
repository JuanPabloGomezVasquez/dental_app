"use client"

import { useState } from "react"
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { es } from "date-fns/locale"
import { AppointmentStatus } from "@prisma/client"
import type { AppointmentWithRelations } from "@/lib/validations/appointment.schema"

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { es },
})

interface AppointmentCalendarProps {
  appointments: AppointmentWithRelations[]
  onSlotSelect: (date: Date) => void
  onEventSelect: (appointment: AppointmentWithRelations) => void
  onRangeChange: (range: { start: Date; end: Date }) => void
  currentDate?: Date
  onNavigate?: (date: Date) => void
}

type RbcEvent = {
  id: string
  title: string
  start: Date
  end: Date
  resource: AppointmentWithRelations
}

export function AppointmentCalendar({
  appointments,
  onSlotSelect,
  onEventSelect,
  onRangeChange,
  currentDate,
  onNavigate,
}: AppointmentCalendarProps) {
  const [currentView, setCurrentView] = useState<View>("week")

  const now = new Date()

  const events: RbcEvent[] = appointments.map((apt) => {
    const start = new Date(apt.date)
    const end = new Date(start.getTime() + 30 * 60 * 1000)
    return {
      id: apt.id,
      title: `${apt.patient.lastName} — ${apt.procedure.name} · ${apt.doctor.name}`,
      start,
      end,
      resource: apt,
    }
  })

  const STATUS_BG: Record<AppointmentStatus, string> = {
    CONFIRMADA: "#3b82f6",
    EN_SALA: "#a855f7",
    EN_CONSULTA: "#f59e0b",
    TERMINADA: "#22c55e",
    NO_ASISTIO: "#9ca3af",
  }

  function eventPropGetter(event: RbcEvent) {
    const status = event.resource.status
    const bg = STATUS_BG[status] ?? "#3b82f6"
    const isDone = status === AppointmentStatus.TERMINADA || status === AppointmentStatus.NO_ASISTIO
    return {
      style: {
        backgroundColor: bg,
        borderColor: bg,
        opacity: isDone ? 0.6 : 1,
      },
    }
  }

  function handleRangeChange(range: Date[] | { start: Date; end: Date }) {
    if (Array.isArray(range)) {
      const first = range[0]
      const last = range[range.length - 1]
      if (!first || !last) return
      const start = new Date(first)
      start.setHours(0, 0, 0, 0)
      const end = new Date(last)
      end.setHours(23, 59, 59, 999)
      onRangeChange({ start, end })
    } else {
      onRangeChange(range)
    }
  }

  return (
    <div style={{ height: "calc(100vh - 180px)" }}>
      <Calendar<RbcEvent>
        localizer={localizer}
        events={events}
        defaultView="week"
        view={currentView}
        onView={setCurrentView}
        date={currentDate}
        onNavigate={onNavigate}
        selectable
        onSelectSlot={(slot) => onSlotSelect(slot.start)}
        onSelectEvent={(event) => onEventSelect(event.resource)}
        onRangeChange={handleRangeChange}
        eventPropGetter={eventPropGetter}
        culture="es"
        messages={{
          next: "Siguiente",
          previous: "Anterior",
          today: "Hoy",
          month: "Mes",
          week: "Semana",
          day: "Día",
          agenda: "Agenda",
          noEventsInRange: "No hay citas en este rango",
          showMore: (total) => `+${total} más`,
        }}
      />
    </div>
  )
}
