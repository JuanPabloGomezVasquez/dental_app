"use client"

import { useState } from "react"
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { es } from "date-fns/locale"
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
}: AppointmentCalendarProps) {
  const [currentView, setCurrentView] = useState<View>("week")

  const events: RbcEvent[] = appointments.map((apt) => {
    const start = new Date(apt.date)
    const end = new Date(start.getTime() + 30 * 60 * 1000)
    return {
      id: apt.id,
      title: `${apt.patient.lastName} — ${apt.procedure.name}`,
      start,
      end,
      resource: apt,
    }
  })

  function handleRangeChange(range: Date[] | { start: Date; end: Date }) {
    if (Array.isArray(range)) {
      const first = range[0]
      const last = range[range.length - 1]
      if (first && last) onRangeChange({ start: first, end: last })
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
        selectable
        onSelectSlot={(slot) => onSlotSelect(slot.start)}
        onSelectEvent={(event) => onEventSelect(event.resource)}
        onRangeChange={handleRangeChange}
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
