import type { AppointmentWithRelations, CreateAppointmentInput } from "@/lib/validations/appointment.schema"
import { appointmentsRepository } from "@/lib/repositories/appointments.repository"
import { doctorsRepository } from "@/lib/repositories/doctors.repository"
import { patientsRepository } from "@/lib/repositories/patients.repository"
import { proceduresRepository } from "@/lib/repositories/procedures.repository"
import { inngest } from "@/inngest/client"
import { NotFoundError, ConflictError } from "@/lib/errors"

const SLOT_DURATION_MS = 30 * 60 * 1000
const DAY_START_HOUR = 8
const DAY_END_HOUR = 18
// Colombia is UTC-5 — shift working hours to UTC so slot times display correctly
const COLOMBIA_OFFSET_HOURS = 5

interface AppointmentsService {
  listByDateRange(
    start: Date,
    end: Date,
    organizationId: string,
    callerRole: "ADMIN" | "DOCTOR",
    callerDoctorId: string | null,
    filterDoctorId?: string
  ): Promise<AppointmentWithRelations[]>
  get(id: string, organizationId: string): Promise<AppointmentWithRelations>
  create(data: CreateAppointmentInput, organizationId: string): Promise<AppointmentWithRelations>
  cancel(id: string, organizationId: string): Promise<void>
  getAvailableSlots(doctorId: string, dateStr: string): Promise<string[]>
}

const service: AppointmentsService = {
  listByDateRange(start, end, organizationId, callerRole, callerDoctorId, filterDoctorId) {
    const doctorId =
      callerRole === "DOCTOR" && callerDoctorId ? callerDoctorId : filterDoctorId
    return appointmentsRepository.findByDateRange(start, end, organizationId, doctorId)
  },

  async get(id, organizationId) {
    const apt = await appointmentsRepository.findById(id, organizationId)
    if (!apt) throw new NotFoundError("Cita no encontrada")
    return apt
  },

  async create(data, organizationId) {
    const [patient, doctor, procedure] = await Promise.all([
      patientsRepository.findById(data.patientId, organizationId),
      doctorsRepository.findById(data.doctorId, organizationId),
      proceduresRepository.findById(data.procedureId, organizationId),
    ])

    if (!patient)   throw new NotFoundError("Paciente no encontrado")
    if (!doctor)    throw new NotFoundError("Doctor no encontrado")
    if (!procedure) throw new NotFoundError("Procedimiento no encontrado")

    const appointmentDate = new Date(data.date)

    const dayStart = new Date(appointmentDate)
    dayStart.setUTCHours(0, 0, 0, 0)
    const dayEnd = new Date(appointmentDate)
    dayEnd.setUTCHours(23, 59, 59, 999)

    const existing = await appointmentsRepository.findByDoctorAndDate(
      data.doctorId,
      dayStart,
      dayEnd
    )

    const isOccupied = existing.some(
      (apt) => apt.date.getTime() === appointmentDate.getTime()
    )
    if (isOccupied) {
      throw new ConflictError("Esa franja horaria ya está ocupada para este doctor")
    }

    const appointment = await appointmentsRepository.create({
      patientId:   data.patientId,
      doctorId:    data.doctorId,
      procedureId: data.procedureId,
      date:        appointmentDate,
      organizationId,
    })

    try {
      const { ids } = await inngest.send({
        name: "dental/appointment.created",
        data: {
          appointmentId:   appointment.id,
          appointmentDate: appointment.date,
          patientPhone:    patient.phone,
        },
      })
      const eventId = ids[0] ?? null
      if (eventId) {
        await appointmentsRepository.updateReminderJobId(appointment.id, eventId)
      }
    } catch (err) {
      console.error("[appointments.service] Failed to enqueue reminder for appointmentId=%s:", appointment.id, err)
    }

    return appointment
  },

  async cancel(id, organizationId) {
    const apt = await appointmentsRepository.findById(id, organizationId)
    if (!apt) throw new NotFoundError("Cita no encontrada")

    await appointmentsRepository.delete(id, organizationId)

    if (apt.reminderJobId) {
      try {
        await inngest.send({
          name: "dental/appointment.cancelled",
          data: { appointmentId: id },
        })
      } catch (err) {
        console.error("[appointments.service] Failed to cancel reminder for appointmentId=%s:", id, err)
      }
    }
  },

  async getAvailableSlots(doctorId, dateStr) {
    const date = new Date(dateStr)

    const dayStart = new Date(date)
    dayStart.setUTCHours(DAY_START_HOUR + COLOMBIA_OFFSET_HOURS, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setUTCHours(DAY_END_HOUR + COLOMBIA_OFFSET_HOURS, 0, 0, 0)

    const existing = await appointmentsRepository.findByDoctorAndDate(
      doctorId,
      dayStart,
      dayEnd
    )

    const occupiedTimes = new Set(existing.map((apt) => apt.date.getTime()))

    const slots: string[] = []
    const current = new Date(dayStart)

    while (current < dayEnd) {
      if (!occupiedTimes.has(current.getTime())) {
        slots.push(current.toISOString())
      }
      current.setTime(current.getTime() + SLOT_DURATION_MS)
    }

    return slots
  },
}

export const appointmentsService = service
