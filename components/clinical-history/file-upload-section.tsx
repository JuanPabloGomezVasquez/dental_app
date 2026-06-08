"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import type { PatientFile } from "@prisma/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

const DATE_FMT = new Intl.DateTimeFormat("es-CO", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

interface FileUploadSectionProps {
  files: PatientFile[];
  patientId: string;
  onUpdate: () => void;
}

export function FileUploadSection({ files, patientId, onUpdate }: FileUploadSectionProps) {
  const [label, setLabel] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Solo se permiten PDF e imágenes (JPG, PNG, WEBP)");
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    if (label.trim()) formData.append("label", label.trim());
    const res = await fetch(`/api/patients/${patientId}/files`, {
      method: "POST",
      body: formData,
    });
    setIsUploading(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(json.error ?? "Error al subir el archivo");
      return;
    }
    setLabel("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onUpdate();
  }

  async function handleDelete(fileId: string) {
    const res = await fetch(`/api/patients/${patientId}/files?fileId=${fileId}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(json.error ?? "Error al eliminar el archivo");
      return;
    }
    onUpdate();
  }

  return (
    <div className="space-y-4">
      <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium text-gray-700">Subir archivo</p>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Etiqueta (opcional)"
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            onChange={handleFileChange}
            disabled={isUploading}
            className="sr-only"
          />
          <span
            className={`inline-block px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 ${
              isUploading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isUploading ? "Subiendo..." : "Seleccionar archivo"}
          </span>
        </label>
      </div>

      {files.length === 0 ? (
        <EmptyState title="Sin archivos" description="Los archivos subidos aparecerán aquí." />
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{f.label ?? f.name}</p>
                <p className="text-xs text-gray-400">
                  {DATE_FMT.format(new Date(f.createdAt))}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                <a
                  href={`/api/patients/${patientId}/files/${f.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Ver
                </a>
                <button
                  onClick={() => setDeletingId(f.id)}
                  aria-label="Eliminar archivo"
                  className="text-gray-400 hover:text-red-500 text-xs px-1"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deletingId !== null}
        title="Eliminar archivo"
        description="¿Eliminar este archivo? Esta acción no se puede deshacer."
        onConfirm={() => {
          if (deletingId) void handleDelete(deletingId);
        }}
        onCancel={() => setDeletingId(null)}
        destructive
      />
    </div>
  );
}
