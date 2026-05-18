import { db } from "@/lib/db"
import type { AppointmentWithRelations, CreateAppointmentInput } from "@/lib/validations/appointment.schema"

interface AppointmentsRepository {
  findByDateRange(
    start: Date,
    end: Date,
    organizationId: string,
    doctorId?: string
  ): Promise<AppointmentWithRelations[]>
  findById(id: string, organizationId: string): Promise<AppointmentWithRelations | null>
  findByDoctorAndDate(doctorId: string, start: Date, end: Date): Promise<{ date: Date }[]>
  findPatientIdsByDoctor(doctorId: string, organizationId: string): Promise<string[]>
  create(data: {
    patientId: string
    doctorId: string
    procedureId: string
    date: Date
    organizationId: string
  }): Promise<AppointmentWithRelations>
  delete(id: string, organizationId: string): Promise<void>
  updateReminderJobId(id: string, reminderJobId: string | null): Promise<void>
}

type PrismaAppointmentWithRelations = {
  id: string
  patientId: string
  doctorId: string
  procedureId: string
  date: Date
  reminderJobId: string | null
  organizationId: string | null
  createdAt: Date
  updatedAt: Date
  patient: { firstName: string; lastName: string }
  doctor: { name: string }
  procedure: { name: string; cupsCode: string | null }
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
  async findByDateRange(start, end, organizationId, doctorId) {
    const apts = await db.appointment.findMany({
      where: {
        organizationId,
        date: { gte: start, lte: end },
        ...(doctorId ? { doctorId } : {}),
      },
      include: INCLUDE,
      orderBy: { date: "asc" },
    })
    return apts.map(serialize)
  },

  async findById(id, organizationId) {
    const apt = await db.appointment.findFirst({
      where: { id, organizationId },
      include: INCLUDE,
    })
    if (!apt) return null
    return serialize(apt)
  },

  findByDoctorAndDate(doctorId, start, end) {
    return db.appointment.findMany({
      where: { doctorId, date: { gte: start, lte: end } },
      select: { date: true },
    })
  },

  async findPatientIdsByDoctor(doctorId, organizationId) {
    const apts = await db.appointment.findMany({
      where: { doctorId, organizationId },
      select: { patientId: true },
      distinct: ["patientId"],
    })
    return apts.map((a) => a.patientId)
  },

  async create(data) {
    const apt = await db.appointment.create({ data, include: INCLUDE })
    return serialize(apt)
  },

  async delete(id, organizationId) {
    await db.appointment.deleteMany({ where: { id, organizationId } })
  },

  async updateReminderJobId(id, reminderJobId) {
    await db.appointment.update({ where: { id }, data: { reminderJobId } })
  },
}

export const appointmentsRepository = repo

export type { CreateAppointmentInput }
