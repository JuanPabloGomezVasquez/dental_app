import { z } from "zod";

const colombianPhone = z
  .string()
  .min(1, "Teléfono requerido")
  .regex(/^(\+?57)?[3][0-9]{9}$/, "Formato inválido (ej: 3001234567)");

const colombianPhoneOptional = z
  .string()
  .regex(/^(\+?57)?[3][0-9]{9}$/, "Formato inválido (ej: 3001234567)")
  .optional()
  .or(z.literal(""));

export const createPatientSchema = z.object({
  firstName: z.string().min(1, "Nombre requerido").max(100),
  lastName: z.string().min(1, "Apellido requerido").max(100),
  idNumber: z
    .string()
    .min(1, "Número de identificación requerido")
    .max(20)
    .regex(/^[0-9]{4,20}$/, "Solo dígitos, entre 4 y 20 caracteres"),
  phone: colombianPhone,
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  birthDate: z
    .string()
    .optional()
    .refine(
      (val) => !val || new Date(val) <= new Date(),
      "La fecha de nacimiento no puede ser futura"
    ),
  address: z.string().max(200).optional(),
  guardianName: z.string().max(100).optional(),
  guardianRelation: z.string().max(100).optional(),
  guardianPhone: colombianPhoneOptional,
  habeaDataConsent: z
    .boolean()
    .refine((val) => val === true, "Debe aceptar el tratamiento de datos personales"),
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
