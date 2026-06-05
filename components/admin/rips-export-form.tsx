"use client";

import { useState } from "react";

export function RipsExportForm() {
  const today = new Date().toISOString().split("T")[0]!;
  const firstOfYear = `${new Date().getFullYear()}-01-01`;

  const [dateFrom, setDateFrom] = useState(firstOfYear);
  const [dateTo, setDateTo] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleExport() {
    setError(null);
    setWarning(null);
    if (!dateFrom || !dateTo) {
      setError("Ingrese ambas fechas.");
      return;
    }
    if (dateFrom > dateTo) {
      setError("La fecha de inicio no puede ser posterior a la fecha de fin.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/rips/export?dateFrom=${dateFrom}&dateTo=${dateTo}`);
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error ?? "Error al generar el archivo RIPS.");
        return;
      }
      const json = (await res.json()) as { usuarios?: unknown[] };
      const usuariosCount = json.usuarios?.length ?? 0;
      if (usuariosCount === 0) {
        setWarning("No se encontraron citas en el período seleccionado. El archivo RIPS estará vacío.");
      }
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rips_${dateFrom}_${dateTo}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Error de red al intentar descargar el archivo.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-5 max-w-md">
      <p className="text-sm text-gray-600">
        Genera el archivo RIPS en formato JSON (Resolución 2275/2023) para el rango de fechas
        seleccionado y descárgalo.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="rips-date-from" className="block text-sm font-medium text-gray-700">
            Fecha inicio
          </label>
          <input
            id="rips-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            max={today}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="rips-date-to" className="block text-sm font-medium text-gray-700">
            Fecha fin
          </label>
          <input
            id="rips-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            max={today}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {warning && <p className="text-sm text-amber-600">{warning}</p>}

      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={isLoading}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {isLoading ? "Generando..." : "Descargar RIPS"}
      </button>
    </div>
  );
}
