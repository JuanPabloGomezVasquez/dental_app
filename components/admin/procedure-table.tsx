"use client";

import { useState } from "react";
import type { Procedure } from "@prisma/client";
import { StatusBadge } from "@/components/ui/status-badge";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";

type Tab = "all" | "active" | "inactive";

interface ProcedureTableProps {
  procedures: Procedure[];
  onEdit: (procedure: Procedure) => void;
  onToggleActive: (procedure: Procedure) => void;
}

export function ProcedureTable({ procedures, onEdit, onToggleActive }: ProcedureTableProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  const filtered = procedures.filter((proc) => {
    const matchesSearch = proc.name.toLowerCase().includes(search.toLowerCase());
    const matchesTab =
      tab === "all" ||
      (tab === "active" && proc.active) ||
      (tab === "inactive" && !proc.active);
    return matchesSearch && matchesTab;
  });

  const tabs: { value: Tab; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "active", label: "Activos" },
    { value: "inactive", label: "Inactivos" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre..." />
        </div>
        <div className="flex gap-1 border border-gray-200 rounded-lg p-1">
          {tabs.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                tab === value ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No hay procedimientos" description="Ajusta los filtros o agrega un nuevo procedimiento." />
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((proc) => (
                <tr key={proc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{proc.name}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{proc.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge active={proc.active} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(proc)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleActive(proc)}
                        className="text-sm text-gray-500 hover:text-gray-800 font-medium"
                      >
                        {proc.active ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
