import type { Procedure } from "@prisma/client";
import { proceduresRepository } from "@/lib/repositories/procedures.repository";
import type { CreateProcedureInput, UpdateProcedureInput } from "@/lib/validations/procedure.schema";
import { NotFoundError, ConflictError } from "@/lib/errors";

interface ProceduresService {
  list(filter?: { active?: boolean }): Promise<Procedure[]>;
  get(id: string): Promise<Procedure>;
  create(data: CreateProcedureInput): Promise<Procedure>;
  update(id: string, data: UpdateProcedureInput): Promise<Procedure>;
  setActive(id: string, active: boolean): Promise<Procedure>;
}

const service: ProceduresService = {
  list(filter) {
    return proceduresRepository.findAll(filter);
  },

  async get(id) {
    const procedure = await proceduresRepository.findById(id);
    if (!procedure) throw new NotFoundError("Procedimiento no encontrado");
    return procedure;
  },

  async create(data) {
    const existing = await proceduresRepository.findByName(data.name);
    if (existing) {
      throw new ConflictError("Ya existe un procedimiento con ese nombre");
    }
    return proceduresRepository.create(data);
  },

  async update(id, data) {
    const existing = await proceduresRepository.findById(id);
    if (!existing) throw new NotFoundError("Procedimiento no encontrado");

    if (data.name && data.name !== existing.name) {
      const conflict = await proceduresRepository.findByName(data.name);
      if (conflict) {
        throw new ConflictError("Ya existe un procedimiento con ese nombre");
      }
    }

    return proceduresRepository.update(id, data);
  },

  async setActive(id, active) {
    const existing = await proceduresRepository.findById(id);
    if (!existing) throw new NotFoundError("Procedimiento no encontrado");

    if (!active) {
      const hasFuture = await proceduresRepository.hasFutureAppointments(id);
      if (hasFuture) {
        throw new ConflictError(
          "No se puede desactivar un procedimiento con citas futuras agendadas"
        );
      }
    }

    return proceduresRepository.setActive(id, active);
  },
};

export const proceduresService = service;
