import { AlertTriangle } from "lucide-react";

interface HabeaDataWarningProps {
  hasConsent: boolean;
}

export function HabeaDataWarning({ hasConsent }: HabeaDataWarningProps) {
  if (hasConsent) return null;

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-yellow-50 border border-yellow-300">
      <AlertTriangle
        size={16}
        className="text-yellow-600 flex-shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <p className="text-sm text-yellow-800">
        Este paciente no ha firmado el consentimiento de Habeas Data (Ley 1581/2012).
        Obtén su consentimiento antes de proceder.
      </p>
    </div>
  );
}
