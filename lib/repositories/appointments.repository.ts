import { db } from "@/lib/db"
import type { AppointmentWithRelations, CreateAppointmentInput } from "@/lib/validations/appointment.schema"

interface AppointmentsRepository {
  findByDateRange(start: Date, end: Date, doctorId?: string): Promise<AppointmentWithRelations[]>
  findById(id: string): Promise<AppointmentWithRelations | null>
  findByDoctorAndDate(doctorId: string, start: Date, end: Date): Promise<{ date: Date }[]>
  create(data: { patientId: string; doctorId: string; procedureId: string; date: Date }): Promise<AppointmentWithRelations>
  delete(id: string): Promise<void>
  updateReminderJobId(id: string, reminderJobId: string | null): Promise<void>
}

type PrismaAppointmentWithRelations = {
  id: string
  patientId: string
  doctorId: string
  procedureId: string
  date: Date
  reminderJobId: string | null
  createdAt: Date
  updatedAt: Date
  patient: { firstName: string; lastName: string }
  doctor: { name: string }
  procedure: { name: string }
}

function serialize(apt: PrismaAppointmentWithRelations): AppointmentWithRelations {
  return {
    ...apt,
    date: apt.date.toISOString(),
    createdAt: apt.createdAt.toISOString(),
    updatedAt: apt.updatedAt.toISOString(),
  }
}

const INCLUDE = {
  patient:   { select: { firstName: true, lastName: true } },
  doctor:    { select: { name: true } },
  procedure: { select: { name: true, cupsCode: true } },
} as const

const repo: AppointmentsRepository = {
  async findByDateRange(start, end, doctorId) {
    const apts = await db.appointment.findMany({
      where: {
        date: { gte: start, lte: end },
        ...(doctorId ? { doctorId } : {}),
      },
      include: INCLUDE,
      orderBy: { date: "asc" },
    })
    return apts.map(serialize)
  },

  async findById(id) {
    const apt = await db.appointment.findUnique({ where: { id }, include: INCLUDE })
    if (!apt) return null
    return serialize(apt)
  },

  findByDoctorAndDate(doctorId, start, end) {
    return db.appointment.findMany({
      where: { doctorId, date: { gte: start, lte: end } },
      select: { date: true },
    })
  },

  async create(data) {
    const apt = await db.appointment.create({ data, include: INCLUDE })
    return serialize(apt)
  },

  async delete(id) {
    await db.appointment.delete({ where: { id } })
  },

  async updateReminderJobId(id, reminderJobId) {
    await db.appointment.update({ where: { id }, data: { reminderJobId } })
  },
}

export const appointmentsRepository = repo

// Re-export type for consumers that need CreateAppointmentInput
export type { CreateAppointmentInput }
