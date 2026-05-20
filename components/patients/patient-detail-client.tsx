"use client";

import { useRouter } from "next/navigation";
import type { Patient } from "@prisma/client";
import type { ClinicalHistoryFull } from "@/lib/repositories/clinical-history.repository";
import { ClinicalHistoryTabs } from "@/components/clinical-history/clinical-history-tabs";
import { PdfExportButton } from "@/components/clinical-history/pdf-export-button";

interface PatientDetailClientProps {
  patient: Patient;
  history: ClinicalHistoryFull;
  currentDoctorId: string | null;
  currentRole: string;
}

function calculateAge(birthDate: Date | null): string | null {
  if (!birthDate) return null;
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const adjusted =
    monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ? age - 1
      : age;
  return `${adjusted} años`;
}

export function PatientDetailClient({ patient, history, currentDoctorId, currentRole }: PatientDetailClientProps) {
  const router = useRouter();
  const age = calculateAge(patient.birthDate);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div className="text-sm text-gray-500 space-y-0.5">
          <p>Tel: {patient.phone}</p>
          {age && <p>{age}</p>}
        </div>
        <PdfExportButton patient={patient} history={history} />
      </div>
      <ClinicalHistoryTabs
        history={history}
        patientId={patient.id}
        currentDoctorId={currentDoctorId}
        currentRole={currentRole}
        onUpdate={() => router.refresh()}
      />
    </div>
  );
}
