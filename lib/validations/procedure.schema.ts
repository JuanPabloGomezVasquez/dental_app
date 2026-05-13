import { z } from "zod";

export const createProcedureSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100),
  description: z.string().max(500).optional(),
});

export const updateProcedureSchema = createProcedureSchema.partial();

export const toggleProcedureSchema = z.object({
  active: z.boolean(),
});

export type CreateProcedureInput = z.infer<typeof createProcedureSchema>;
export type UpdateProcedureInput = z.infer<typeof updateProcedureSchema>;
