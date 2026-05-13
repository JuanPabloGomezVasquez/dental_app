"use client";

import { useState } from "react";

export function RipsExportForm() {
  const today = new Date().toISOString().split("T")[0]!;
  const firstOfYear = `${new Date().getFullYear()}-01-01`;

  const [dateFrom, setDateFrom] = useState(firstOfYear);
  const [dateTo, setDateTo] = useState(today);
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    if (!dateFrom || !dateTo) {
      setError("Ingrese ambas fechas.");
      return;
    }
    if (dateFrom > dateTo) {
      setError("La fecha de inicio no puede ser posterior a la fecha de fin.");
      return;
    }
    window.open(`/api/rips/export?dateFrom=${dateFrom}&dateTo=${dateTo}`, "_blank");
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
            Desde
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
            Hasta
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

      <button
        type="button"
        onClick={handleExport}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Descargar RIPS
      </button>
    </div>
  );
}
