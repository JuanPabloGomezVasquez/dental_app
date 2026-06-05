"use client"

import Link from "next/link";
import { Check, ChevronRight, CalendarX, Clock, AlertCircle } from "lucide-react";
import type { AppointmentWithRelations } from "@/lib/validations/appointment.schema";
import { AppointmentStatus } from "@prisma/client";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface TodayScheduleProps {
  appointments: AppointmentWithRelations[];
  showDoctorName?: boolean;
  now: Date;
}

function formatTimeBogota(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Bogota",
  });
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  CONFIRMADA: "Confirmada",
  EN_SALA: "En sala",
  EN_CONSULTA: "En consulta",
  TERMINADA: "Terminada",
  NO_ASISTIO: "No asistió",
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  CONFIRMADA: "bg-blue-100 text-blue-700",
  EN_SALA: "bg-purple-100 text-purple-700",
  EN_CONSULTA: "bg-amber-100 text-amber-700",
  TERMINADA: "bg-green-100 text-green-700",
  NO_ASISTIO: "bg-gray-100 text-gray-500",
};

const STATUS_ORDER: AppointmentStatus[] = [
  AppointmentStatus.CONFIRMADA,
  AppointmentStatus.EN_SALA,
  AppointmentStatus.EN_CONSULTA,
  AppointmentStatus.TERMINADA,
  AppointmentStatus.NO_ASISTIO,
];

function StatusSelector({
  appointmentId,
  current,
  onUpdated,
}: {
  appointmentId: string;
  current: AppointmentStatus;
  onUpdated: (id: string, status: AppointmentStatus) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as AppointmentStatus;
    startTransition(async () => {
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        onUpdated(appointmentId, next);
        toast.success("Estado actualizado");
      } else {
        toast.error("No se pudo actualizar el estado");
      }
    });
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      disabled={isPending}
      onClick={(e) => e.preventDefault()}
      className={`text-[11px] font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${STATUS_COLORS[current]} disabled:opacity-60`}
    >
      {STATUS_ORDER.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

export function TodaySchedule({
  appointments,
  showDoctorName = false,
  now,
}: TodayScheduleProps) {
  const [statuses, setStatuses] = useState<Record<string, AppointmentStatus>>(
    () => Object.fromEntries(appointments.map((a) => [a.id, a.status]))
  );

  function handleStatusUpdate(id: string, status: AppointmentStatus) {
    setStatuses((prev) => ({ ...prev, [id]: status }));
  }

  if (appointments.length === 0) {
    return (
      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Agenda de hoy
          </h2>
          <Link
            href="/appointments"
            className="text-xs font-medium text-blue-600 hover:underline inline-flex items-center gap-0.5"
          >
            Ver agenda
            <ChevronRight size={14} />
          </Link>
        </header>
        <div className="p-10 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-3">
            <CalendarX size={24} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">
            No tienes citas para hoy
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Aprovecha para ponerte al día con historias clínicas.
          </p>
        </div>
      </section>
    );
  }

  const nowMs = now.getTime();
  const nextIdx = appointments.findIndex(
    (apt) => {
      const s = statuses[apt.id] ?? apt.status;
      return s === AppointmentStatus.CONFIRMADA || s === AppointmentStatus.EN_SALA || s === AppointmentStatus.EN_CONSULTA;
    }
  );

  return (
    <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-900">
            Agenda de hoy
          </h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {appointments.length}
          </span>
        </div>
        <Link
          href="/appointments"
          className="text-xs font-medium text-blue-600 hover:underline inline-flex items-center gap-0.5"
        >
          Ver agenda
          <ChevronRight size={14} />
        </Link>
      </header>

      <ol className="divide-y divide-gray-100">
        {appointments.map((apt, idx) => {
          const currentStatus = statuses[apt.id] ?? apt.status;
          const isDone =
            currentStatus === AppointmentStatus.TERMINADA ||
            currentStatus === AppointmentStatus.NO_ASISTIO;
          const isNext = idx === nextIdx;

          return (
            <li key={apt.id} className={`flex items-center gap-4 px-5 py-3.5 ${isNext ? "bg-blue-50/60" : ""}`}>
              {/* Status indicator */}
              <div className="flex-shrink-0">
                {isDone ? (
                  currentStatus === AppointmentStatus.TERMINADA ? (
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                      <Check size={14} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                      <AlertCircle size={14} />
                    </div>
                  )
                ) : isNext ? (
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    <Clock size={14} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
                    <Clock size={14} />
                  </div>
                )}
              </div>

              {/* Time */}
              <div className="flex-shrink-0 w-14">
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    isDone ? "text-gray-400" : "text-gray-900"
                  }`}
                >
                  {formatTimeBogota(apt.date)}
                </p>
              </div>

              {/* Patient & procedure */}
              <Link
                href={`/patients/${apt.patientId}`}
                className="flex-1 min-w-0 hover:underline"
              >
                <p
                  className={`text-sm font-medium truncate ${
                    isDone ? "text-gray-400" : "text-gray-900"
                  }`}
                >
                  {apt.patient.firstName} {apt.patient.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {apt.procedure.name}
                  {showDoctorName && (
                    <span className="ml-1">· {apt.doctor.name}</span>
                  )}
                </p>
              </Link>

              {/* Status selector */}
              <div className="flex-shrink-0">
                <StatusSelector
                  appointmentId={apt.id}
                  current={currentStatus}
                  onUpdated={handleStatusUpdate}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
