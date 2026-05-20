import Link from "next/link";
import { Check, ChevronRight, CalendarX, Clock } from "lucide-react";
import type { AppointmentWithRelations } from "@/lib/validations/appointment.schema";

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

export function TodaySchedule({
  appointments,
  showDoctorName = false,
  now,
}: TodayScheduleProps) {
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

  /* Compute "next" appointment = first future one */
  const nowMs = now.getTime();
  const nextIdx = appointments.findIndex(
    (apt) => new Date(apt.date).getTime() >= nowMs
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
          const aptDate = new Date(apt.date);
          const isPast = aptDate.getTime() < nowMs;
          const isNext = idx === nextIdx;

          return (
            <li key={apt.id}>
              <Link
                href={`/patients/${apt.patientId}`}
                className={`flex items-center gap-4 px-5 py-3.5 transition-colors group ${
                  isNext ? "bg-blue-50/60" : "hover:bg-gray-50"
                }`}
              >
                {/* Status indicator */}
                <div className="flex-shrink-0">
                  {isPast ? (
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                      <Check size={14} />
                    </div>
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
                      isPast ? "text-gray-400" : "text-gray-900"
                    }`}
                  >
                    {formatTimeBogota(apt.date)}
                  </p>
                </div>

                {/* Patient & procedure */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      isPast ? "text-gray-500" : "text-gray-900"
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
                </div>

                {/* Next badge */}
                {isNext && (
                  <span className="hidden sm:inline-block flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md bg-blue-600 text-white">
                    Próxima
                  </span>
                )}

                <ChevronRight
                  size={16}
                  className="flex-shrink-0 text-gray-300 group-hover:text-gray-500 transition-colors"
                />
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
