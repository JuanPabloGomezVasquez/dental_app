import { z } from "zod";

export const createDoctorSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100),
  specialty: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
});

export const updateDoctorSchema = createDoctorSchema.partial();

export const toggleDoctorSchema = z.object({
  active: z.boolean(),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
