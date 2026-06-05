import { z } from "zod";
import { InventoryUnit } from "@prisma/client";

export const createInventoryItemSchema = z.object({
  commercialName: z.string().min(1, "Nombre comercial requerido").max(200),
  genericName: z.string().max(200).optional(),
  categoryId: z.string().min(1, "Categoría requerida"),
  quantity: z.number().min(0, "Cantidad no puede ser negativa").max(999999, "Cantidad demasiado alta"),
  unit: z.nativeEnum(InventoryUnit),
  minStock: z.number().min(0, "Stock mínimo no puede ser negativo").max(999999, "Stock mínimo demasiado alto"),
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial();

export const updateStockSchema = z.object({
  newQuantity: z.number().min(0, "La cantidad no puede ser negativa"),
});

export const toggleInventorySchema = z.object({
  active: z.boolean(),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type UpdateStockInput = z.infer<typeof updateStockSchema>;
