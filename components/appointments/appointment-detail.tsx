"use client"

import { useState, useEffect, useTransition } from "react"
import { toast } from "sonner"
import { X } from "lucide-react"
import { AppointmentStatus } from "@prisma/client"
import type { AppointmentWithRelations } from "@/lib/validations/appointment.schema"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface AppointmentDetailProps {
  open: boolean
  appointment: AppointmentWithRelations | null
  onCancel: (id: string) => Promise<void>
  onClose: () => void
  onStatusChange?: (id: string, status: AppointmentStatus) => void
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  CONFIRMADA: "Confirmada",
  EN_SALA: "En sala",
  EN_CONSULTA: "En consulta",
  TERMINADA: "Terminada",
  NO_ASISTIO: "No asistió",
}

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  CONFIRMADA: "bg-blue-100 text-blue-700",
  EN_SALA: "bg-purple-100 text-purple-700",
  EN_CONSULTA: "bg-amber-100 text-amber-700",
  TERMINADA: "bg-green-100 text-green-700",
  NO_ASISTIO: "bg-gray-100 text-gray-500",
}

const STATUS_ORDER: AppointmentStatus[] = [
  AppointmentStatus.CONFIRMADA,
  AppointmentStatus.EN_SALA,
  AppointmentStatus.EN_CONSULTA,
  AppointmentStatus.TERMINADA,
  AppointmentStatus.NO_ASISTIO,
]

export function AppointmentDetail({
  open,
  appointment,
  onCancel,
  onClose,
  onStatusChange,
}: AppointmentDetailProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<AppointmentStatus>(
    appointment?.status ?? AppointmentStatus.CONFIRMADA
  )
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) {
      setIsConfirmOpen(false)
      setIsCanceling(false)
    }
    if (appointment) {
      setCurrentStatus(appointment.status)
    }
  }, [open, appointment])

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

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as AppointmentStatus
    startTransition(async () => {
      const res = await fetch(`/api/appointments/${appointment!.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) {
        setCurrentStatus(next)
        onStatusChange?.(appointment!.id, next)
        toast.success("Estado actualizado")
      } else {
        toast.error("No se pudo actualizar el estado")
      }
    })
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
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Estado</p>
              <select
                value={currentStatus}
                onChange={handleStatusChange}
                disabled={isPending}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${STATUS_COLORS[currentStatus]}`}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s} className="text-gray-900 bg-white">
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
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
