"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface PatientPrivacyActionsProps {
  patientId: string;
  patientName: string;
}

export function PatientPrivacyActions({ patientId, patientName }: PatientPrivacyActionsProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnonymize() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/anonymize`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Error al anonimizar");
      }
      router.push("/patients");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
    setShowConfirm(false);
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Privacidad y Datos (Ley 1581/2012)
      </h2>

      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={`/api/patients/${patientId}/export-data`}
          download
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          Exportar mis datos
        </a>

        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
        >
          Anonimizar paciente
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ConfirmDialog
        open={showConfirm}
        title="Anonimizar paciente"
        description={`Esta acción reemplazará todos los datos personales de ${patientName} con valores anónimos. Es irreversible. ¿Desea continuar?`}
        confirmLabel={loading ? "Anonimizando…" : "Sí, anonimizar"}
        cancelLabel="Cancelar"
        destructive
        onConfirm={handleAnonymize}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
