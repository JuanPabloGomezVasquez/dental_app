"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X } from "lucide-react";
import { InventoryUnit } from "@prisma/client";
import {
  createInventoryItemSchema,
  type CreateInventoryItemInput,
} from "@/lib/validations/inventory.schema";
import type { InventoryItemWithCategory } from "@/lib/repositories/inventory.repository";

interface InventoryFormProps {
  open: boolean;
  item?: InventoryItemWithCategory | null;
  categories: { id: string; name: string }[];
  onSuccess: (item: InventoryItemWithCategory) => void;
  onClose: () => void;
}

const EMPTY: CreateInventoryItemInput = {
  commercialName: "",
  categoryId: "",
  quantity: 0,
  unit: InventoryUnit.UNIDAD,
  minStock: 0,
};

export function InventoryForm({ open, item, categories, onSuccess, onClose }: InventoryFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateInventoryItemInput>({ resolver: zodResolver(createInventoryItemSchema) });

  useEffect(() => {
    if (open) {
      reset(
        item
          ? {
              commercialName: item.commercialName,
              genericName: item.genericName ?? undefined,
              categoryId: item.categoryId,
              quantity: Number(item.quantity),
              unit: item.unit,
              minStock: Number(item.minStock),
            }
          : EMPTY
      );
    }
  }, [open, item, reset]);

  if (!open) return null;

  async function onSubmit(data: CreateInventoryItemInput) {
    const url = item ? `/api/inventory/${item.id}` : "/api/inventory";
    const method = item ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      if (res.status === 409) {
        setError("root", { message: body.error ?? "SKU duplicado" });
      } else {
        toast.error(body.error ?? "Error al guardar");
      }
      return;
    }
    const saved = (await res.json()) as InventoryItemWithCategory;
    toast.success(item ? "Insumo actualizado" : "Insumo creado");
    onSuccess(saved);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            {item ? "Editar insumo" : "Nuevo insumo"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {errors.root && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
              {errors.root.message}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Nombre comercial *</label>
              <input {...register("commercialName")} className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              {errors.commercialName && <p role="alert" className="text-xs text-red-600 mt-0.5">{errors.commercialName.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Nombre genérico</label>
              <input {...register("genericName")} className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Categoría *</label>
            <select {...register("categoryId")} className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
              <option value="">Seleccionar...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.categoryId && <p role="alert" className="text-xs text-red-600 mt-0.5">{errors.categoryId.message}</p>}
            <p className="mt-0.5 text-[10px] text-gray-400">El SKU se genera automáticamente al guardar.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Cantidad *</label>
              <input type="number" step="0.001" min="0" {...register("quantity", { valueAsNumber: true })} className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              {errors.quantity && <p role="alert" className="text-xs text-red-600 mt-0.5">{errors.quantity.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Unidad *</label>
              <select {...register("unit")} className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                {Object.values(InventoryUnit).map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Stock mínimo *</label>
              <input type="number" step="0.001" min="0" {...register("minStock", { valueAsNumber: true })} className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              {errors.minStock && <p role="alert" className="text-xs text-red-600 mt-0.5">{errors.minStock.message}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
