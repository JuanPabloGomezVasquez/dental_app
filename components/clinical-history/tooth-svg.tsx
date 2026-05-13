"use client";

import type { OdontogramEntry, Surface, ToothStatus } from "@prisma/client";

const STATUS_COLORS: Record<ToothStatus, string> = {
  SANO: "#f0fdf4",
  CARIES: "#ef4444",
  OBTURACION: "#f59e0b",
  CORONA: "#3b82f6",
  ENDODONCIA: "#8b5cf6",
  IMPLANTE: "#6b7280",
  AUSENTE: "#1f2937",
  EXTRAIDO: "#111827",
  FRACTURA: "#dc2626",
};

const STROKE = "#9ca3af";

interface ToothSVGProps {
  toothNumber: number;
  entries: OdontogramEntry[];
  onClick: (surface: Surface) => void;
  readOnly?: boolean;
}

function surfaceColor(entries: OdontogramEntry[], surface: Surface): string {
  const entry = entries.find((e) => e.surface === surface);
  return entry ? STATUS_COLORS[entry.status] : STATUS_COLORS.SANO;
}

export function ToothSVG({ toothNumber, entries, onClick, readOnly = false }: ToothSVGProps) {
  const cursor = readOnly ? "default" : "pointer";
  const handleClick = readOnly ? (_: Surface) => {} : onClick;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width="40" height="40" viewBox="0 0 40 40" className="block">
        <polygon
          points="0,0 40,0 27,13 13,13"
          fill={surfaceColor(entries, "VESTIBULAR")}
          stroke={STROKE}
          strokeWidth="0.5"
          style={{ cursor }}
          onClick={() => handleClick("VESTIBULAR")}
        />
        <polygon
          points="0,40 40,40 27,27 13,27"
          fill={surfaceColor(entries, "LINGUAL")}
          stroke={STROKE}
          strokeWidth="0.5"
          style={{ cursor }}
          onClick={() => handleClick("LINGUAL")}
        />
        <polygon
          points="0,0 13,13 13,27 0,40"
          fill={surfaceColor(entries, "MESIAL")}
          stroke={STROKE}
          strokeWidth="0.5"
          style={{ cursor }}
          onClick={() => handleClick("MESIAL")}
        />
        <polygon
          points="40,0 27,13 27,27 40,40"
          fill={surfaceColor(entries, "DISTAL")}
          stroke={STROKE}
          strokeWidth="0.5"
          style={{ cursor }}
          onClick={() => handleClick("DISTAL")}
        />
        <rect
          x="13"
          y="13"
          width="14"
          height="14"
          fill={surfaceColor(entries, "OCLUSAL")}
          stroke={STROKE}
          strokeWidth="0.5"
          style={{ cursor }}
          onClick={() => handleClick("OCLUSAL")}
        />
      </svg>
      <span className="text-[9px] text-gray-500 leading-none">{toothNumber}</span>
    </div>
  );
}
