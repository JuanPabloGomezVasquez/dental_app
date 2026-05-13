"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { X } from "lucide-react"
import type { AppointmentWithRelations } from "@/lib/validations/appointment.schema"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface AppointmentDetailProps {
  open: boolean
  appointment: AppointmentWithRelations | null
  onCancel: (id: string) => Promise<void>
  onClose: () => void
}

export function AppointmentDetail({
  open,
  appointment,
  onCancel,
  onClose,
}: AppointmentDetailProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)

  // Reset internal state when modal closes
  useEffect(() => {
    if (!open) {
      setIsConfirmOpen(false)
      setIsCanceling(false)
    }
  }, [open])

  if (!open || !appointment) return <></>

  const formattedDate = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Bogota",
  }).format(new Date(appointment.date))

  async function handleConfirmCancel() {
    setIsCanceling(true)
    try {
      await onCancel(appointment!.id)
      toast.success("Cita cancelada exitosamente")
      setIsConfirmOpen(false)
      onClose()
    } catch {
      toast.error("No se pudo cancelar la cita")
    } finally {
      setIsCanceling(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
        <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 id="detail-title" className="text-base font-semibold text-gray-900">
              Detalle de cita
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar detalle de cita"
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Paciente</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">
                {appointment.patient.firstName} {appointment.patient.lastName}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Doctor</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{appointment.doctor.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Procedimiento</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{appointment.procedure.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Fecha y hora</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5 capitalize">{formattedDate}</p>
            </div>
          </div>

          <div className="px-6 pb-6 flex justify-end">
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              disabled={isCanceling}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isCanceling ? "Cancelando..." : "Cancelar cita"}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={isConfirmOpen}
        title="¿Cancelar esta cita?"
        description={`Se cancelará la cita de ${appointment.patient.firstName} ${appointment.patient.lastName}. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, cancelar"
        onConfirm={handleConfirmCancel}
        onCancel={() => setIsConfirmOpen(false)}
        destructive
      />
    </>
  )
}
