"use client";

import dynamic from "next/dynamic";
import type { Patient } from "@prisma/client";
import type { ClinicalHistoryFull } from "@/lib/repositories/clinical-history.repository";

export type PdfExportButtonProps = {
  patient: Pick<Patient, "firstName" | "lastName" | "idNumber">;
  history: ClinicalHistoryFull;
};

const PdfButtonInner = dynamic(
  () => import("./pdf-button-inner").then((m) => m.PdfButtonInner),
  {
    ssr: false,
    loading: () => (
      <span className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-400">
        Exportar HC
      </span>
    ),
  }
);

export function PdfExportButton(props: PdfExportButtonProps) {
  return <PdfButtonInner {...props} />;
}
