"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { OdontogramEntry, Surface, ToothStatus } from "@prisma/client";
import type { CreateOdontogramEntryInput } from "@/lib/validations/clinical-history.schema";

const SURFACE_LABELS: Record<Surface, string> = {
  OCLUSAL: "Oclusal",
  MESIAL: "Mesial",
  DISTAL: "Distal",
  VESTIBULAR: "Vestibular",
  LINGUAL: "Lingual",
};

const STATUS_LABELS: Record<ToothStatus, string> = {
  SANO: "Sano",
  CARIES: "Caries",
  OBTURACION: "Obturación",
  CORONA: "Corona",
  ENDODONCIA: "Endodoncia",
  IMPLANTE: "Implante",
  AUSENTE: "Ausente",
  EXTRAIDO: "Extraído",
  FRACTURA: "Fractura",
};

const ALL_STATUSES = Object.keys(STATUS_LABELS) as ToothStatus[];

interface ToothDetailProps {
  open: boolean;
  toothNumber: number | null;
  surface: Surface | null;
  currentEntry: OdontogramEntry | null;
  patientId: string;
  onSave: () => void;
  onClose: () => void;
}

export function ToothDetail({
  open,
  toothNumber,
  surface,
  currentEntry,
  patientId,
  onSave,
  onClose,
}: ToothDetailProps) {
  const [status, setStatus] = useState<ToothStatus>("SANO");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStatus(currentEntry?.status ?? "SANO");
      setNote(currentEntry?.note ?? "");
    }
  }, [open, currentEntry]);

  if (!open || toothNumber === null || surface === null) return null;

  async function handleSave() {
    setIsSaving(true);
    const body: CreateOdontogramEntryInput = {
      toothNumber: toothNumber!,
      surface: surface!,
      status,
      note: note.trim() || undefined,
    };
    const res = await fetch(`/api/patients/${patientId}/odontogram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setIsSaving(false);
    if (!res.ok) {
      toast.error("Error al guardar");
      return;
    }
    onSave();
    onClose();
  }

  async function handleReset() {
    if (!currentEntry) return;
    setIsSaving(true);
    await fetch(`/api/patients/${patientId}/odontogram?entryId=${currentEntry.id}`, {
      method: "DELETE",
    });
    setIsSaving(false);
    onSave();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl p-6 w-80 space-y-4">
        <h3 className="font-semibold text-gray-900">
          Diente #{toothNumber} — {SURFACE_LABELS[surface]}
        </h3>
        <div className="space-y-1">
          <label htmlFor="tooth-status" className="text-xs font-medium text-gray-600">
            Estado
          </label>
          <select
            id="tooth-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ToothStatus)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="tooth-note" className="text-xs font-medium text-gray-600">
            Nota (opcional)
          </label>
          <textarea
            id="tooth-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm resize-none"
          />
        </div>
        <div className="flex gap-2 justify-end">
          {currentEntry && (
            <button
              onClick={handleReset}
              disabled={isSaving}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
            >
              Limpiar
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
