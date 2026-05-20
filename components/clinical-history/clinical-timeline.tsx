"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { NoteType } from "@prisma/client";
import type { NoteWithDoctor } from "@/lib/repositories/clinical-history.repository";
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
  timeZone: "America/Bogota",
});

const PAGE_SIZE = 5;
const COLLAPSE_CHARS = 300;

interface ClinicalTimelineProps {
  notes: NoteWithDoctor[];
  patientId: string;
  currentDoctorId: string | null;
  currentRole: string;
  onDelete: () => void;
}

export function ClinicalTimeline({
  notes,
  patientId,
  currentDoctorId,
  currentRole,
  onDelete,
}: ClinicalTimelineProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const isAdmin = currentRole === "ADMIN" || currentRole === "SUPER_ADMIN";
  const totalPages = Math.ceil(notes.length / PAGE_SIZE);
  const pageNotes = notes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
      const json = (await res.json()) as { error?: string };
      toast.error(json.error ?? "Error al eliminar la nota");
      return;
    }
    onDelete();
  }

  function startEdit(note: NoteWithDoctor) {
    setEditingId(note.id);
    setEditContent(note.content);
  }

  async function saveEdit(noteId: string) {
    setIsSavingEdit(true);
    const res = await fetch(`/api/patients/${patientId}/notes?noteId=${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    setIsSavingEdit(false);
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      toast.error(json.error ?? "Error al actualizar la nota");
      return;
    }
    toast.success("Nota actualizada");
    setEditingId(null);
    onDelete(); // refresca la lista
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <div className="space-y-3">
        {pageNotes.map((note) => {
          const isOwner = note.doctorId === currentDoctorId;
          const canEdit = isOwner;
          const canDelete = isOwner || isAdmin;
          const isLong = note.content.length > COLLAPSE_CHARS;
          const isExpanded = expandedIds.has(note.id);
          const displayContent =
            isLong && !isExpanded
              ? note.content.slice(0, COLLAPSE_CHARS) + "…"
              : note.content;

          return (
            <div
              key={note.id}
              className="border border-gray-200 rounded-lg p-4 bg-white space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${NOTE_TYPE_COLORS[note.type]}`}
                  >
                    {NOTE_TYPE_LABELS[note.type]}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {note.doctor?.name ?? "Doctor"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {DATE_FMT.format(new Date(note.createdAt))}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canEdit && editingId !== note.id && (
                    <button
                      type="button"
                      onClick={() => startEdit(note)}
                      aria-label="Editar nota"
                      className="text-xs text-gray-400 hover:text-blue-500 px-1"
                    >
                      ✎
                    </button>
                  )}
                  {canDelete && editingId !== note.id && (
                    <button
                      type="button"
                      onClick={() => setDeletingId(note.id)}
                      aria-label="Eliminar nota"
                      className="text-xs text-gray-400 hover:text-red-500 px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void saveEdit(note.id)}
                      disabled={isSavingEdit}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSavingEdit ? "Guardando..." : "Guardar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-gray-600 border border-gray-300 text-xs rounded-md hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{displayContent}</p>
                  {isLong && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(note.id)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {isExpanded ? "Ver menos" : "Ver más"}
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-xs text-gray-500">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      )}

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
