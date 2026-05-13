"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { ClinicalNote, NoteType } from "@prisma/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  INGRESO: "Ingreso",
  EVOLUCION: "Evolución",
  PROCEDIMIENTO: "Procedimiento",
  INTERCONSULTA: "Interconsulta",
  EGRESO: "Egreso",
};

const NOTE_TYPE_COLORS: Record<NoteType, string> = {
  INGRESO: "bg-blue-100 text-blue-700",
  EVOLUCION: "bg-green-100 text-green-700",
  PROCEDIMIENTO: "bg-purple-100 text-purple-700",
  INTERCONSULTA: "bg-yellow-100 text-yellow-700",
  EGRESO: "bg-red-100 text-red-700",
};

const DATE_FMT = new Intl.DateTimeFormat("es-CO", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

interface ClinicalTimelineProps {
  notes: ClinicalNote[];
  patientId: string;
  onDelete: () => void;
}

export function ClinicalTimeline({ notes, patientId, onDelete }: ClinicalTimelineProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (notes.length === 0) {
    return (
      <EmptyState
        title="Sin notas clínicas"
        description="Las notas aparecerán aquí una vez agregadas."
      />
    );
  }

  async function handleConfirmDelete(noteId: string) {
    const res = await fetch(`/api/patients/${patientId}/notes?noteId=${noteId}`, {
      method: "DELETE",
    });
    setDeletingId(null);
    if (!res.ok) {
      toast.error("Error al eliminar la nota");
      return;
    }
    onDelete();
  }

  return (
    <>
      <div className="space-y-3">
        {notes.map((note) => (
          <div
            key={note.id}
            className="border border-gray-200 rounded-lg p-4 bg-white space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${NOTE_TYPE_COLORS[note.type]}`}
                >
                  {NOTE_TYPE_LABELS[note.type]}
                </span>
                <span className="text-xs text-gray-400">
                  {DATE_FMT.format(new Date(note.createdAt))}
                </span>
              </div>
              <button
                onClick={() => setDeletingId(note.id)}
                aria-label="Eliminar nota"
                className="text-gray-400 hover:text-red-500 text-xs px-1"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-line">{note.content}</p>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={deletingId !== null}
        title="Eliminar nota"
        description="¿Eliminar esta nota clínica? Esta acción no se puede deshacer."
        onConfirm={() => {
          if (deletingId) void handleConfirmDelete(deletingId);
        }}
        onCancel={() => setDeletingId(null)}
        destructive
      />
    </>
  );
}
