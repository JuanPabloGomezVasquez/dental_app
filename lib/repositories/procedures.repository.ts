import { db } from "@/lib/db";
import type { Procedure } from "@prisma/client";
import type { CreateProcedureInput, UpdateProcedureInput } from "@/lib/validations/procedure.schema";

interface ProceduresRepository {
  findAll(options?: { organizationId: string; active?: boolean }): Promise<Procedure[]>;
  findById(id: string, organizationId: string): Promise<Procedure | null>;
  findByName(name: string, organizationId: string): Promise<Procedure | null>;
  create(data: CreateProcedureInput & { organizationId: string }): Promise<Procedure>;
  update(id: string, organizationId: string, data: UpdateProcedureInput): Promise<Procedure>;
  setActive(id: string, organizationId: string, active: boolean): Promise<Procedure>;
  hasFutureAppointments(id: string, organizationId: string): Promise<boolean>;
}

const repo: ProceduresRepository = {
  findAll(options) {
    return db.procedure.findMany({
      where: {
        ...(options?.organizationId ? { organizationId: options.organizationId } : {}),
        ...(options?.active !== undefined ? { active: options.active } : {}),
      },
      orderBy: { name: "asc" },
    });
  },

  findById(id, organizationId) {
    return db.procedure.findFirst({ where: { id, organizationId } });
  },

  findByName(name, organizationId) {
    return db.procedure.findFirst({ where: { name, organizationId } });
  },

  create(data) {
    return db.procedure.create({ data });
  },

  update(id, organizationId, data) {
    return db.procedure.update({ where: { id }, data: { ...data, organizationId } });
  },

  setActive(id, organizationId, active) {
    return db.procedure.update({ where: { id }, data: { active, organizationId } });
  },

  async hasFutureAppointments(id, organizationId) {
    const count = await db.appointment.count({
      where: { procedureId: id, organizationId, date: { gte: new Date() } },
    });
    return count > 0;
  },
};

export const proceduresRepository = repo;
