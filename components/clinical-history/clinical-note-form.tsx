"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { NoteType } from "@prisma/client";
import { createNoteSchema, type CreateNoteInput } from "@/lib/validations/clinical-history.schema";

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  INGRESO: "Ingreso",
  EVOLUCION: "Evolución",
  PROCEDIMIENTO: "Procedimiento",
  INTERCONSULTA: "Interconsulta",
  EGRESO: "Egreso",
};

interface ClinicalNoteFormProps {
  patientId: string;
  onSuccess: () => void;
}

export function ClinicalNoteForm({ patientId, onSuccess }: ClinicalNoteFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateNoteInput>({ resolver: zodResolver(createNoteSchema) });

  async function onSubmit(data: CreateNoteInput) {
    const res = await fetch(`/api/patients/${patientId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      toast.error(body.error ?? "Error al guardar la nota");
      return;
    }
    toast.success("Nota agregada");
    reset();
    onSuccess();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white"
    >
      <p className="text-sm font-medium text-gray-700">Agregar nota</p>
      <div>
        <label htmlFor="note-type" className="text-xs font-medium text-gray-600">
          Tipo
        </label>
        <select
          id="note-type"
          {...register("type")}
          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          {(Object.keys(NOTE_TYPE_LABELS) as NoteType[]).map((t) => (
            <option key={t} value={t}>
              {NOTE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="note-content" className="text-xs font-medium text-gray-600">
          Contenido
        </label>
        <textarea
          id="note-content"
          {...register("content")}
          rows={3}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none"
        />
        {errors.content && (
          <p role="alert" className="text-xs text-red-600 mt-0.5">
            {errors.content.message}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? "Guardando..." : "Agregar nota"}
      </button>
    </form>
  );
}
