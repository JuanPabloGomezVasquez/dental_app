import { db } from "@/lib/db";
import type { Procedure } from "@prisma/client";
import type { CreateProcedureInput, UpdateProcedureInput } from "@/lib/validations/procedure.schema";

interface ProceduresRepository {
  findAll(options?: { active?: boolean }): Promise<Procedure[]>;
  findById(id: string): Promise<Procedure | null>;
  findByName(name: string): Promise<Procedure | null>;
  create(data: CreateProcedureInput): Promise<Procedure>;
  update(id: string, data: UpdateProcedureInput): Promise<Procedure>;
  setActive(id: string, active: boolean): Promise<Procedure>;
  hasFutureAppointments(id: string): Promise<boolean>;
}

const repo: ProceduresRepository = {
  findAll(options) {
    return db.procedure.findMany({
      where: options?.active !== undefined ? { active: options.active } : undefined,
      orderBy: { name: "asc" },
    });
  },

  findById(id) {
    return db.procedure.findUnique({ where: { id } });
  },

  findByName(name) {
    return db.procedure.findUnique({ where: { name } });
  },

  create(data) {
    return db.procedure.create({ data });
  },

  update(id, data) {
    return db.procedure.update({ where: { id }, data });
  },

  setActive(id, active) {
    return db.procedure.update({ where: { id }, data: { active } });
  },

  async hasFutureAppointments(id) {
    const count = await db.appointment.count({
      where: { procedureId: id, date: { gte: new Date() } },
    });
    return count > 0;
  },
};

export const proceduresRepository = repo;
