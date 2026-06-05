"use client"

import { useState } from "react"
import type { AppointmentWithRelations } from "@/lib/validations/appointment.schema"
import { AppointmentCalendar } from "@/components/appointments/appointment-calendar"
import { AppointmentForm } from "@/components/appointments/appointment-form"
import { AppointmentDetail } from "@/components/appointments/appointment-detail"
import { DoctorFilter } from "@/components/appointments/doctor-filter"

interface AppointmentsPageClientProps {
  initialAppointments: AppointmentWithRelations[]
  initialRange: { start: string; end: string }
  openNew?: boolean
}

export function AppointmentsPageClient({
  initialAppointments,
  initialRange,
  openNew = false,
}: AppointmentsPageClientProps) {
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>(initialAppointments)
  const [currentRange, setCurrentRange] = useState({
    start: new Date(initialRange.start),
    end: new Date(initialRange.end),
  })
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null)
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())
  const [isFormOpen, setIsFormOpen] = useState(openNew)
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function fetchAppointments(range: { start: Date; end: Date }, doctorId: string | null) {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      })
      if (doctorId) params.set("doctorId", doctorId)

      const res = await fetch(`/api/appointments?${params.toString()}`)
      if (res.ok) {
        setAppointments(await res.json() as AppointmentWithRelations[])
      }
    } finally {
      setIsLoading(false)
    }
  }

  function handleRangeChange(range: { start: Date; end: Date }) {
    setCurrentRange(range)
    void fetchAppointments(range, selectedDoctorId)
  }

  function handleDoctorChange(doctorId: string | null) {
    setSelectedDoctorId(doctorId)
    void fetchAppointments(currentRange, doctorId)
  }

  function handleSlotSelect(date: Date) {
    setSelectedSlot(date)
    setIsFormOpen(true)
  }

  function handleEventSelect(appointment: AppointmentWithRelations) {
    setSelectedAppointment(appointment)
    setIsDetailOpen(true)
  }

  function handleFormSuccess(appointment: AppointmentWithRelations) {
    setAppointments((prev) => [...prev, appointment])
  }

  async function handleCancel(id: string) {
    const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("No se pudo cancelar la cita")
    setAppointments((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Agendamiento</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona las citas del consultorio</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={calendarDate.toISOString().split("T")[0]}
            onChange={(e) => {
              if (e.target.value) {
                const picked = new Date(e.target.value + "T12:00:00")
                setCalendarDate(picked)
              }
            }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Ir a fecha"
          />
          <DoctorFilter selectedDoctorId={selectedDoctorId} onChange={handleDoctorChange} />
          <button
            type="button"
            onClick={() => { setSelectedSlot(null); setIsFormOpen(true) }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Nueva Cita
          </button>
        </div>
      </div>

      <div className="flex-1 relative p-6 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
            <span className="text-sm text-gray-500">Cargando citas...</span>
          </div>
        )}
        <AppointmentCalendar
          appointments={appointments}
          onSlotSelect={handleSlotSelect}
          onEventSelect={handleEventSelect}
          onRangeChange={handleRangeChange}
          currentDate={calendarDate}
          onNavigate={setCalendarDate}
        />
      </div>

      <AppointmentForm
        open={isFormOpen}
        initialDate={selectedSlot}
        onSuccess={handleFormSuccess}
        onClose={() => { setIsFormOpen(false); setSelectedSlot(null) }}
      />

      <AppointmentDetail
        open={isDetailOpen}
        appointment={selectedAppointment}
        onCancel={handleCancel}
        onClose={() => { setIsDetailOpen(false); setSelectedAppointment(null) }}
      />
    </div>
  )
}
