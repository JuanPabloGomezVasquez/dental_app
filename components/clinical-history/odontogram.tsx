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

export function Odontogram({ entries, onSurfaceClick, readOnly }: OdontogramProps) {
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
        {LEGEND.map(([label, color]) => (
          <div key={label} className="flex items-center gap-1">
            <div
              className="h-3 w-3 rounded-sm border border-gray-300"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
