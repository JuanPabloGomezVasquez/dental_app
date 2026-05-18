import type { Doctor } from "@prisma/client";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { doctorsRepository } from "@/lib/repositories/doctors.repository";
import { orgModulesRepository } from "@/lib/repositories/org-modules.repository";
import type { CreateDoctorInput, UpdateDoctorInput } from "@/lib/validations/doctor.schema";
import { NotFoundError, ConflictError } from "@/lib/errors";

interface DoctorsService {
  list(options: { organizationId: string; active?: boolean }): Promise<Doctor[]>;
  get(id: string, organizationId: string): Promise<Doctor>;
  create(data: CreateDoctorInput, organizationId: string): Promise<Doctor>;
  update(id: string, organizationId: string, data: UpdateDoctorInput): Promise<Doctor>;
  setActive(id: string, organizationId: string, active: boolean): Promise<Doctor>;
  enableLogin(
    doctorId: string,
    organizationId: string,
    email: string,
    initialPassword: string
  ): Promise<void>;
  disableLogin(doctorId: string, organizationId: string): Promise<void>;
  setModulePerm(
    doctorId: string,
    organizationId: string,
    module: string,
    enabled: boolean
  ): Promise<void>;
}

const service: DoctorsService = {
  list({ organizationId, active }) {
    return doctorsRepository.findAll({ organizationId, active });
  },

  async get(id, organizationId) {
    const doctor = await doctorsRepository.findById(id, organizationId);
    if (!doctor) throw new NotFoundError("Doctor no encontrado");
    return doctor;
  },

  create(data, organizationId) {
    return doctorsRepository.create({ ...data, organizationId });
  },

  async update(id, organizationId, data) {
    const existing = await doctorsRepository.findById(id, organizationId);
    if (!existing) throw new NotFoundError("Doctor no encontrado");
    return doctorsRepository.update(id, organizationId, data);
  },

  async setActive(id, organizationId, active) {
    const existing = await doctorsRepository.findById(id, organizationId);
    if (!existing) throw new NotFoundError("Doctor no encontrado");

    if (!active) {
      const hasFuture = await doctorsRepository.hasFutureAppointments(id, organizationId);
      if (hasFuture) {
        throw new ConflictError(
          "No se puede desactivar un doctor con citas futuras agendadas"
        );
      }
    }

    return doctorsRepository.setActive(id, organizationId, active);
  },

  async enableLogin(doctorId, organizationId, email, initialPassword) {
    const doctor = await doctorsRepository.findById(doctorId, organizationId);
    if (!doctor) throw new NotFoundError("Doctor no encontrado");

    if (doctor.userId) {
      throw new ConflictError("Este doctor ya tiene acceso al sistema habilitado");
    }

    const emailConflict = await db.user.findUnique({ where: { email } });
    if (emailConflict) {
      throw new ConflictError("Ya existe un usuario con ese correo electrónico");
    }

    const hashedPassword = await bcrypt.hash(initialPassword, 12);

    await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          hashedPassword,
          name: doctor.name,
          role: "DOCTOR",
          organizationId,
        },
      });
      await tx.doctor.update({ where: { id: doctorId }, data: { userId: user.id } });
    });
  },

  async disableLogin(doctorId, organizationId) {
    const doctor = await doctorsRepository.findById(doctorId, organizationId);
    if (!doctor) throw new NotFoundError("Doctor no encontrado");
    if (!doctor.userId) return;

    await db.user.update({ where: { id: doctor.userId }, data: { active: false } });
  },

  async setModulePerm(doctorId, organizationId, module, enabled) {
    const doctor = await doctorsRepository.findById(doctorId, organizationId);
    if (!doctor) throw new NotFoundError("Doctor no encontrado");

    const { AppModule } = await import("@prisma/client");
    const validModule = module as (typeof AppModule)[keyof typeof AppModule];

    await orgModulesRepository.setDoctorPerm(doctorId, validModule, enabled);
  },
};

export const doctorsService = service;
