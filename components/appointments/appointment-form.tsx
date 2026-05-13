"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { X } from "lucide-react"
import type { AppointmentWithRelations } from "@/lib/validations/appointment.schema"
import { PatientSearch } from "@/components/appointments/patient-search"
import { PatientForm } from "@/components/patients/patient-form"
import type { Patient } from "@prisma/client"

interface AppointmentFormProps {
  open: boolean
  initialDate?: Date | null
  onSuccess: (appointment: AppointmentWithRelations) => void
  onClose: () => void
}

type DoctorOption = { id: string; name: string }
type ProcedureOption = { id: string; name: string }

function toDateInputValue(date: Date): string {
  return date.toISOString().split("T")[0] ?? ""
}

function formatSlot(isoString: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Bogota",
  }).format(new Date(isoString))
}

export function AppointmentForm({
  open,
  initialDate,
  onSuccess,
  onClose,
}: AppointmentFormProps) {
  const [doctors, setDoctors] = useState<DoctorOption[]>([])
  const [procedures, setProcedures] = useState<ProcedureOption[]>([])
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false)

  const [selectedDoctorId, setSelectedDoctorId] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedSlot, setSelectedSlot] = useState("")
  const [selectedProcedureId, setSelectedProcedureId] = useState("")
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Reset and preload when opening
  useEffect(() => {
    if (!open) return

    setSelectedDoctorId("")
    setSelectedDate(initialDate ? toDateInputValue(initialDate) : "")
    setSelectedSlot("")
    setSelectedProcedureId("")
    setSelectedPatientId(null)
    setAvailableSlots([])
    setFormError(null)

    void Promise.all([
      fetch("/api/admin/doctors/active").then((r) => r.json()),
      fetch("/api/admin/procedures/active").then((r) => r.json()),
    ]).then(([doctorsData, proceduresData]) => {
      setDoctors(doctorsData as DoctorOption[])
      setProcedures(proceduresData as ProcedureOption[])
    })
  }, [open, initialDate])

  // Reload slots when doctor or date changes
  useEffect(() => {
    if (!selectedDoctorId || !selectedDate) {
      setAvailableSlots([])
      setSelectedSlot("")
      return
    }

    setIsLoadingSlots(true)
    setSelectedSlot("")

    const params = new URLSearchParams({ doctorId: selectedDoctorId, date: selectedDate })
    fetch(`/api/appointments/available-slots?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setAvailableSlots(data as string[]))
      .catch(() => setAvailableSlots([]))
      .finally(() => setIsLoadingSlots(false))
  }, [selectedDoctorId, selectedDate])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)

    if (!selectedPatientId || !selectedDoctorId || !selectedProcedureId || !selectedSlot) {
      setFormError("Todos los campos son requeridos")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId:   selectedPatientId,
          doctorId:    selectedDoctorId,
          procedureId: selectedProcedureId,
          date:        selectedSlot,
        }),
      })

      const json: unknown = await res.json()

      if (!res.ok) {
        const message =
          typeof json === "object" && json !== null && "error" in json
            ? String((json as Record<string, unknown>).error)
            : "Error al crear la cita"
        setFormError(res.status === 409 ? "Esa franja ya está ocupada" : message)
        return
      }

      toast.success("Cita agendada exitosamente")
      onSuccess(json as AppointmentWithRelations)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleNewPatientSuccess(patient: Patient) {
    setSelectedPatientId(patient.id)
    setIsPatientFormOpen(false)
  }

  if (!open) return <></>

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
        <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Nueva Cita</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar formulario de nueva cita"
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="overflow-y-auto p-6 space-y-4 flex-1"
          >
            <div>
              <label htmlFor="apt-doctor" className="block text-sm font-medium text-gray-700 mb-1">
                Doctor <span aria-hidden="true">*</span>
              </label>
              <select
                id="apt-doctor"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar doctor...</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="apt-date" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha <span aria-hidden="true">*</span>
              </label>
              <input
                id="apt-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="apt-slot" className="block text-sm font-medium text-gray-700 mb-1">
                Horario <span aria-hidden="true">*</span>
              </label>
              <select
                id="apt-slot"
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                disabled={!selectedDoctorId || !selectedDate || isLoadingSlots}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isLoadingSlots ? "Cargando horarios..." : "Seleccionar horario..."}
                </option>
                {availableSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {formatSlot(slot)}
                  </option>
                ))}
              </select>
              {!isLoadingSlots && selectedDoctorId && selectedDate && availableSlots.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">No hay horarios disponibles para este día</p>
              )}
            </div>

            <div>
              <label htmlFor="apt-procedure" className="block text-sm font-medium text-gray-700 mb-1">
                Procedimiento <span aria-hidden="true">*</span>
              </label>
              <select
                id="apt-procedure"
                value={selectedProcedureId}
                onChange={(e) => setSelectedProcedureId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar procedimiento...</option>
                {procedures.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paciente <span aria-hidden="true">*</span>
              </label>
              <PatientSearch
                selectedPatientId={selectedPatientId}
                onSelect={(patient) => setSelectedPatientId(patient.id)}
                onClear={() => setSelectedPatientId(null)}
                onNewPatient={() => setIsPatientFormOpen(true)}
              />
            </div>

            {formError && (
              <p role="alert" className="text-xs text-red-600">{formError}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? "Guardando..." : "Agendar cita"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <PatientForm
        open={isPatientFormOpen}
        onSuccess={handleNewPatientSuccess}
        onClose={() => setIsPatientFormOpen(false)}
      />
    </>
  )
}
