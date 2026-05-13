import { z } from "zod";
import { NoteType, Surface, ToothStatus } from "@prisma/client";

export const createNoteSchema = z.object({
  type: z.nativeEnum(NoteType),
  content: z.string().min(1, "El contenido es requerido").max(5000),
  doctorId: z.string().min(1, "Doctor requerido"),
});

export const createOdontogramEntrySchema = z.object({
  toothNumber: z.number().int().min(11).max(48),
  surface: z.nativeEnum(Surface),
  status: z.nativeEnum(ToothStatus),
  note: z.string().max(500).optional(),
});

export const updateBackgroundSchema = z.object({
  background: z.string().max(5000).optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type CreateOdontogramEntryInput = z.infer<typeof createOdontogramEntrySchema>;
export type UpdateBackgroundInput = z.infer<typeof updateBackgroundSchema>;
