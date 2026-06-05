import { z } from "zod";

export const DENTAL_SPECIALTIES = [
  "Odontología General",
  "Odontopediatría",
  "Ortodoncia y Ortopedia Maxilar",
  "Endodoncia",
  "Periodoncia",
  "Cirugía Oral y Maxilofacial",
  "Rehabilitación Oral",
  "Prostodoncia",
  "Radiología Oral y Maxilofacial",
  "Patología Oral y Maxilofacial",
  "Estética Dental",
  "Implantología Oral",
  "Odontología Forense",
  "Salud Pública Oral",
] as const;

export type DentalSpecialty = (typeof DENTAL_SPECIALTIES)[number];

const colombianMobileOptional = z
  .string()
  .regex(/^3[0-9]{9}$/, "Debe ser un celular de 10 dígitos (ej: 3001234567)")
  .optional()
  .or(z.literal(""));

export const createDoctorSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100),
  specialty: z.enum(DENTAL_SPECIALTIES).optional(),
  phone: colombianMobileOptional,
  email: z.string().email("Email inválido"),
  idDocument: z.string().max(20).optional().or(z.literal("")),
  professionalCard: z.string().max(50).optional().or(z.literal("")),
  rethus: z.string().max(50).optional().or(z.literal("")),
});

export const updateDoctorSchema = createDoctorSchema.partial();

export const toggleDoctorSchema = z.object({
  active: z.boolean(),
});

export const enableLoginSchema = z.object({
  email: z.string().email("Email inválido"),
  initialPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type EnableLoginInput = z.infer<typeof enableLoginSchema>;
