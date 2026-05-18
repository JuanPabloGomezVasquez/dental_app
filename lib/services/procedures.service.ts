import type { Procedure } from "@prisma/client";
import { proceduresRepository } from "@/lib/repositories/procedures.repository";
import type { CreateProcedureInput, UpdateProcedureInput } from "@/lib/validations/procedure.schema";
import { NotFoundError, ConflictError } from "@/lib/errors";

interface ProceduresService {
  list(options: { organizationId: string; active?: boolean }): Promise<Procedure[]>;
  get(id: string, organizationId: string): Promise<Procedure>;
  create(data: CreateProcedureInput, organizationId: string): Promise<Procedure>;
  update(id: string, organizationId: string, data: UpdateProcedureInput): Promise<Procedure>;
  setActive(id: string, organizationId: string, active: boolean): Promise<Procedure>;
}

const service: ProceduresService = {
  list({ organizationId, active }) {
    return proceduresRepository.findAll({ organizationId, active });
  },

  async get(id, organizationId) {
    const procedure = await proceduresRepository.findById(id, organizationId);
    if (!procedure) throw new NotFoundError("Procedimiento no encontrado");
    return procedure;
  },

  async create(data, organizationId) {
    const existing = await proceduresRepository.findByName(data.name, organizationId);
    if (existing) {
      throw new ConflictError("Ya existe un procedimiento con ese nombre");
    }
    return proceduresRepository.create({ ...data, organizationId });
  },

  async update(id, organizationId, data) {
    const existing = await proceduresRepository.findById(id, organizationId);
    if (!existing) throw new NotFoundError("Procedimiento no encontrado");

    if (data.name && data.name !== existing.name) {
      const conflict = await proceduresRepository.findByName(data.name, organizationId);
      if (conflict) {
        throw new ConflictError("Ya existe un procedimiento con ese nombre");
      }
    }

    return proceduresRepository.update(id, organizationId, data);
  },

  async setActive(id, organizationId, active) {
    const existing = await proceduresRepository.findById(id, organizationId);
    if (!existing) throw new NotFoundError("Procedimiento no encontrado");

    if (!active) {
      const hasFuture = await proceduresRepository.hasFutureAppointments(id, organizationId);
      if (hasFuture) {
        throw new ConflictError(
          "No se puede desactivar un procedimiento con citas futuras agendadas"
        );
      }
    }

    return proceduresRepository.setActive(id, organizationId, active);
  },
};

export const proceduresService = service;
