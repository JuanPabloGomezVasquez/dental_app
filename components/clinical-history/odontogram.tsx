"use client";

import type { OdontogramEntry, Surface, ToothStatus } from "@prisma/client";
import { ToothSVG } from "./tooth-svg";

const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11] as const;
const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28] as const;
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41] as const;
const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38] as const;

const LEGEND: [ToothStatus, string][] = [
  ["SANO", "#f0fdf4"],
  ["CARIES", "#ef4444"],
  ["OBTURACION", "#f59e0b"],
  ["CORONA", "#3b82f6"],
  ["ENDODONCIA", "#8b5cf6"],
  ["IMPLANTE", "#6b7280"],
  ["AUSENTE", "#1f2937"],
  ["EXTRAIDO", "#111827"],
  ["FRACTURA", "#dc2626"],
];

interface OdontogramProps {
  entries: OdontogramEntry[];
  onSurfaceClick: (toothNumber: number, surface: Surface) => void;
  readOnly?: boolean;
}

interface TeethRowProps {
  teeth: readonly number[];
  entries: OdontogramEntry[];
  onSurfaceClick: (t: number, s: Surface) => void;
  readOnly?: boolean;
}

function TeethRow({ teeth, entries, onSurfaceClick, readOnly }: TeethRowProps) {
  return (
    <div className="flex gap-0.5">
      {teeth.map((n) => (
        <ToothSVG
          key={n}
          toothNumber={n}
          entries={entries.filter((e) => e.toothNumber === n)}
          onClick={(surface) => onSurfaceClick(n, surface)}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

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

const SURFACE_LABELS: Record<Surface, string> = {
  OCLUSAL: "Oclusal",
  MESIAL: "Mesial",
  DISTAL: "Distal",
  VESTIBULAR: "Vestibular",
  LINGUAL: "Lingual",
};

export function Odontogram({ entries, onSurfaceClick, readOnly }: OdontogramProps) {
  const findings = entries.filter((e) => e.status !== "SANO");
  const byTooth = findings.reduce<Record<number, OdontogramEntry[]>>((acc, e) => {
    (acc[e.toothNumber] ??= []).push(e);
    return acc;
  }, {});
  const toothNumbers = Object.keys(byTooth)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="overflow-x-auto">
      <div className="flex flex-col items-center gap-1 min-w-max">
        <div className="flex gap-2">
          <TeethRow teeth={UPPER_RIGHT} entries={entries} onSurfaceClick={onSurfaceClick} readOnly={readOnly} />
          <div className="w-px bg-gray-300" />
          <TeethRow teeth={UPPER_LEFT} entries={entries} onSurfaceClick={onSurfaceClick} readOnly={readOnly} />
        </div>
        <div className="h-px w-full bg-gray-300" />
        <div className="flex gap-2">
          <TeethRow teeth={LOWER_RIGHT} entries={entries} onSurfaceClick={onSurfaceClick} readOnly={readOnly} />
          <div className="w-px bg-gray-300" />
          <TeethRow teeth={LOWER_LEFT} entries={entries} onSurfaceClick={onSurfaceClick} readOnly={readOnly} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
        {LEGEND.map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div
              className="h-3 w-3 rounded-sm border border-gray-300"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] text-gray-600">{STATUS_LABELS[status]}</span>
          </div>
        ))}
      </div>

      {toothNumbers.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Hallazgos registrados</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-2 py-1 text-left font-medium text-gray-600">Diente</th>
                <th className="border border-gray-200 px-2 py-1 text-left font-medium text-gray-600">Superficie</th>
                <th className="border border-gray-200 px-2 py-1 text-left font-medium text-gray-600">Estado</th>
                <th className="border border-gray-200 px-2 py-1 text-left font-medium text-gray-600">Nota</th>
                {!readOnly && <th className="border border-gray-200 px-2 py-1" />}
              </tr>
            </thead>
            <tbody>
              {toothNumbers.flatMap((t) =>
                (byTooth[t] ?? []).map((e) => (
                  <tr key={e.id} className="even:bg-gray-50">
                    <td className="border border-gray-200 px-2 py-1 font-medium">{t}</td>
                    <td className="border border-gray-200 px-2 py-1">{SURFACE_LABELS[e.surface]}</td>
                    <td className="border border-gray-200 px-2 py-1">{STATUS_LABELS[e.status]}</td>
                    <td className="border border-gray-200 px-2 py-1 text-gray-500">{e.note ?? "—"}</td>
                    {!readOnly && (
                      <td className="border border-gray-200 px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => onSurfaceClick(e.toothNumber, e.surface)}
                          className="text-[10px] text-blue-600 hover:underline"
                        >
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {findings.length === 0 && (
        <p className="mt-4 text-xs text-gray-400">Sin hallazgos registrados.</p>
      )}
    </div>
  );
}
