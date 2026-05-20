"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Surface } from "@prisma/client";
import type { ClinicalHistoryFull } from "@/lib/repositories/clinical-history.repository";
import { Odontogram } from "./odontogram";
import { ToothDetail } from "./tooth-detail";
import { ClinicalNoteForm } from "./clinical-note-form";
import { ClinicalTimeline } from "./clinical-timeline";
import { FileUploadSection } from "./file-upload-section";

const TABS = ["Antecedentes", "Odontograma", "Notas", "Archivos"] as const;
type Tab = (typeof TABS)[number];

interface ClinicalHistoryTabsProps {
  history: ClinicalHistoryFull;
  patientId: string;
  currentDoctorId: string | null;
  currentRole: string;
  onUpdate: () => void;
}

type SelectedSurface = { toothNumber: number; surface: Surface } | null;

export function ClinicalHistoryTabs({ history, patientId, currentDoctorId, currentRole, onUpdate }: ClinicalHistoryTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Antecedentes");
  const [background, setBackground] = useState(history.background ?? "");
  const [isSavingBg, setIsSavingBg] = useState(false);
  const [selectedSurface, setSelectedSurface] = useState<SelectedSurface>(null);

  async function handleSaveBackground() {
    setIsSavingBg(true);
    const res = await fetch(`/api/patients/${patientId}/clinical-history`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ background }),
    });
    setIsSavingBg(false);
    if (!res.ok) {
      toast.error("Error al guardar antecedentes");
      return;
    }
    toast.success("Antecedentes guardados");
    onUpdate();
  }

  const currentEntry = selectedSurface
    ? history.odontogram.find(
        (e) =>
          e.toothNumber === selectedSurface.toothNumber &&
          e.surface === selectedSurface.surface
      ) ?? null
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Antecedentes" && (
        <div className="space-y-3">
          <textarea
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            placeholder="Antecedentes médicos y odontológicos relevantes..."
            className="w-full rounded-md border border-gray-300 p-3 text-sm min-h-[160px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSaveBackground}
            disabled={isSavingBg}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSavingBg ? "Guardando..." : "Guardar"}
          </button>
        </div>
      )}

      {activeTab === "Odontograma" && (
        <>
          <Odontogram
            entries={history.odontogram}
            onSurfaceClick={(toothNumber, surface) =>
              setSelectedSurface({ toothNumber, surface })
            }
          />
          <ToothDetail
            open={selectedSurface !== null}
            toothNumber={selectedSurface?.toothNumber ?? null}
            surface={selectedSurface?.surface ?? null}
            currentEntry={currentEntry}
            patientId={patientId}
            onSave={onUpdate}
            onClose={() => setSelectedSurface(null)}
          />
        </>
      )}

      {activeTab === "Notas" && (
        <div className="space-y-4">
          <ClinicalNoteForm patientId={patientId} onSuccess={onUpdate} />
          <ClinicalTimeline
            notes={history.notes}
            patientId={patientId}
            currentDoctorId={currentDoctorId}
            currentRole={currentRole}
            onDelete={onUpdate}
          />
        </div>
      )}

      {activeTab === "Archivos" && (
        <FileUploadSection files={history.files} patientId={patientId} onUpdate={onUpdate} />
      )}
    </div>
  );
}
