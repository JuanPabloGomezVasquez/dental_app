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


export function AppointmentForm({
  open,
  initialDate,
  onSuccess,
  onClose,
}: AppointmentFormProps) {
  const [doctors, setDoctors] = useState<DoctorOption[]>([])
  const [procedures, setProcedures] = useState<ProcedureOption[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false)

  const [selectedDoctorId, setSelectedDoctorId] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [selectedProcedureId, setSelectedProcedureId] = useState("")
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Reset and preload when opening
  useEffect(() => {
    if (!open) return

    setSelectedDoctorId("")
    setSelectedDate(initialDate ? toDateInputValue(initialDate) : "")
    setSelectedTime(initialDate ? `${String(initialDate.getHours()).padStart(2, "0")}:${String(initialDate.getMinutes()).padStart(2, "0")}` : "")
    setSelectedProcedureId("")
    setSelectedPatientId(null)
    setFormError(null)

    void Promise.all([
      fetch("/api/admin/doctors/active").then((r) => r.json()),
      fetch("/api/admin/procedures/active").then((r) => r.json()),
    ]).then(([doctorsData, proceduresData]) => {
      setDoctors(doctorsData as DoctorOption[])
      setProcedures(proceduresData as ProcedureOption[])
    })
  }, [open, initialDate])


  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)

    if (!selectedPatientId || !selectedDoctorId || !selectedProcedureId || !selectedDate || !selectedTime) {
      setFormError("Todos los campos son requeridos")
      return
    }

    // Convert Colombia local time (UTC-5) to UTC ISO string
    const [hours, minutes] = selectedTime.split(":").map(Number)
    const dateUtc = new Date(selectedDate)
    dateUtc.setUTCHours((hours ?? 0) + 5, minutes ?? 0, 0, 0)

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId:   selectedPatientId,
          doctorId:    selectedDoctorId,
          procedureId: selectedProcedureId,
          date:        dateUtc.toISOString(),
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
              <label htmlFor="apt-time" className="block text-sm font-medium text-gray-700 mb-1">
                Hora <span aria-hidden="true">*</span>
              </label>
              <input
                id="apt-time"
                type="time"
                value={selectedTime}
                min="08:00"
                max="18:00"
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
