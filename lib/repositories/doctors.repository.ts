import { db } from "@/lib/db";
import type { Doctor } from "@prisma/client";
import type { CreateDoctorInput, UpdateDoctorInput } from "@/lib/validations/doctor.schema";

interface DoctorsRepository {
  findAll(options?: { active?: boolean }): Promise<Doctor[]>;
  findById(id: string): Promise<Doctor | null>;
  create(data: CreateDoctorInput): Promise<Doctor>;
  update(id: string, data: UpdateDoctorInput): Promise<Doctor>;
  setActive(id: string, active: boolean): Promise<Doctor>;
  hasFutureAppointments(id: string): Promise<boolean>;
}

const repo: DoctorsRepository = {
  findAll(options) {
    return db.doctor.findMany({
      where: options?.active !== undefined ? { active: options.active } : undefined,
      orderBy: { name: "asc" },
    });
  },

  findById(id) {
    return db.doctor.findUnique({ where: { id } });
  },

  create(data) {
    return db.doctor.create({ data });
  },

  update(id, data) {
    return db.doctor.update({ where: { id }, data });
  },

  setActive(id, active) {
    return db.doctor.update({ where: { id }, data: { active } });
  },

  async hasFutureAppointments(id) {
    const count = await db.appointment.count({
      where: { doctorId: id, date: { gte: new Date() } },
    });
    return count > 0;
  },
};

export const doctorsRepository = repo;
