import { z } from "zod";

export const createPatientSchema = z.object({
  firstName: z.string().min(1, "Nombre requerido").max(100),
  lastName: z.string().min(1, "Apellido requerido").max(100),
  idNumber: z.string().min(1, "Número de identificación requerido").max(20),
  phone: z.string().min(1, "Teléfono requerido").max(20),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  birthDate: z.string().optional(),
  address: z.string().max(200).optional(),
  guardianName: z.string().max(100).optional(),
  guardianRelation: z.string().max(100).optional(),
  guardianPhone: z.string().max(20).optional(),
  habeaDataConsent: z.boolean().default(false),
});

export const updatePatientSchema = createPatientSchema
  .partial()
  .omit({ habeaDataConsent: true, idNumber: true });

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

export function isMinor(birthDate: string | undefined): boolean {
  if (!birthDate) return false;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return false;
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  return age - (hasBirthdayPassed ? 0 : 1) < 18;
}
