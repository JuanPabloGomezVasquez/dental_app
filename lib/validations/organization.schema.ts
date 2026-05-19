import { z } from "zod";
import { AppModule } from "@prisma/client";

export const createOrganizationSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  slug: z
    .string()
    .min(2, "El slug debe tener al menos 2 caracteres")
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  adminName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  adminEmail: z.string().email("Email inválido"),
  adminPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  modules: z.array(z.nativeEnum(AppModule)).default([]),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  active: z.boolean().optional(),
});

export const setOrgModuleSchema = z.object({
  module: z.nativeEnum(AppModule),
  enabled: z.boolean(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type SetOrgModuleInput = z.infer<typeof setOrgModuleSchema>;
