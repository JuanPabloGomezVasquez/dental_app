import type { Doctor } from "@prisma/client";
import { doctorsRepository } from "@/lib/repositories/doctors.repository";
import type { CreateDoctorInput, UpdateDoctorInput } from "@/lib/validations/doctor.schema";
import { NotFoundError, ConflictError } from "@/lib/errors";

interface DoctorsService {
  list(filter?: { active?: boolean }): Promise<Doctor[]>;
  get(id: string): Promise<Doctor>;
  create(data: CreateDoctorInput): Promise<Doctor>;
  update(id: string, data: UpdateDoctorInput): Promise<Doctor>;
  setActive(id: string, active: boolean): Promise<Doctor>;
}

const service: DoctorsService = {
  list(filter) {
    return doctorsRepository.findAll(filter);
  },

  async get(id) {
    const doctor = await doctorsRepository.findById(id);
    if (!doctor) throw new NotFoundError("Doctor no encontrado");
    return doctor;
  },

  create(data) {
    return doctorsRepository.create(data);
  },

  async update(id, data) {
    const existing = await doctorsRepository.findById(id);
    if (!existing) throw new NotFoundError("Doctor no encontrado");
    return doctorsRepository.update(id, data);
  },

  async setActive(id, active) {
    const existing = await doctorsRepository.findById(id);
    if (!existing) throw new NotFoundError("Doctor no encontrado");

    if (!active) {
      const hasFuture = await doctorsRepository.hasFutureAppointments(id);
      if (hasFuture) {
        throw new ConflictError(
          "No se puede desactivar un doctor con citas futuras agendadas"
        );
      }
    }

    return doctorsRepository.setActive(id, active);
  },
};

export const doctorsService = service;
