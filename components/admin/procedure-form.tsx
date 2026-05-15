"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { Procedure } from "@prisma/client";
import { createProcedureSchema, updateProcedureSchema, type CreateProcedureInput } from "@/lib/validations/procedure.schema";

interface ProcedureFormProps {
  open: boolean;
  procedure?: Procedure | null;
  onSuccess: (procedure: Procedure) => void;
  onClose: () => void;
}

export function ProcedureForm({ open, procedure, onSuccess, onClose }: ProcedureFormProps) {
  const isEditing = !!procedure;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateProcedureInput>({
    resolver: zodResolver(
      (isEditing ? updateProcedureSchema : createProcedureSchema) as typeof createProcedureSchema
    ),
  });

  useEffect(() => {
    if (open) {
      reset(
        procedure
          ? { name: procedure.name, description: procedure.description ?? "" }
          : { name: "", description: "" }
      );
    }
  }, [open, procedure, reset]);

  async function onSubmit(data: CreateProcedureInput) {
    const url = isEditing
      ? `/api/admin/procedures/${procedure.id}`
      : "/api/admin/procedures";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json: unknown = await res.json();

    if (!res.ok) {
      const message =
        typeof json === "object" && json !== null && "error" in json
          ? String((json as Record<string, unknown>).error)
          : "Error al guardar";
      setError("root", { message });
      toast.error(message);
      return;
    }

    toast.success(isEditing ? "Procedimiento actualizado" : "Procedimiento creado");
    onSuccess(json as Procedure);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">
            {isEditing ? "Editar Procedimiento" : "Nuevo Procedimiento"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <label htmlFor="proc-name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span aria-hidden="true">*</span>
            </label>
            <input
              id="proc-name"
              type="text"
              {...register("name")}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && (
              <p role="alert" className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="proc-description" className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              id="proc-description"
              rows={3}
              {...register("description")}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {errors.root && (
            <p role="alert" className="text-xs text-red-600">{errors.root.message}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
