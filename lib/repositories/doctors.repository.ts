import { db } from "@/lib/db";
import type { Doctor } from "@prisma/client";
import type { CreateDoctorInput, UpdateDoctorInput } from "@/lib/validations/doctor.schema";

export type DoctorWithUserId = Doctor & { userId: string | null };

interface DoctorsRepository {
  findAll(options?: { organizationId: string; active?: boolean }): Promise<Doctor[]>;
  findById(id: string, organizationId: string): Promise<Doctor | null>;
  findByUserId(userId: string): Promise<Doctor | null>;
  create(data: CreateDoctorInput & { organizationId: string }): Promise<Doctor>;
  update(id: string, organizationId: string, data: UpdateDoctorInput): Promise<Doctor>;
  setActive(id: string, organizationId: string, active: boolean): Promise<Doctor>;
  setUserId(id: string, userId: string | null): Promise<Doctor>;
  hasFutureAppointments(id: string, organizationId: string): Promise<boolean>;
}

const repo: DoctorsRepository = {
  findAll(options) {
    return db.doctor.findMany({
      where: {
        ...(options?.organizationId ? { organizationId: options.organizationId } : {}),
        ...(options?.active !== undefined ? { active: options.active } : {}),
      },
      orderBy: { name: "asc" },
    });
  },

  findById(id, organizationId) {
    return db.doctor.findFirst({ where: { id, organizationId } });
  },

  findByUserId(userId) {
    return db.doctor.findFirst({ where: { userId } });
  },

  create(data) {
    return db.doctor.create({ data });
  },

  update(id, organizationId, data) {
    return db.doctor.update({ where: { id }, data: { ...data, organizationId } });
  },

  setActive(id, organizationId, active) {
    return db.doctor.update({ where: { id }, data: { active, organizationId } });
  },

  setUserId(id, userId) {
    return db.doctor.update({ where: { id }, data: { userId } });
  },

  async hasFutureAppointments(id, organizationId) {
    const count = await db.appointment.count({
      where: { doctorId: id, organizationId, date: { gte: new Date() } },
    });
    return count > 0;
  },
};

export const doctorsRepository = repo;
