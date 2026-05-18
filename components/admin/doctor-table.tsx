"use client";

import { useState } from "react";
import type { Doctor } from "@prisma/client";
import { StatusBadge } from "@/components/ui/status-badge";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";

type Tab = "all" | "active" | "inactive";

interface DoctorTableProps {
  doctors: Doctor[];
  onEdit: (doctor: Doctor) => void;
  onToggleActive: (doctor: Doctor) => void;
  onPermissions: (doctor: Doctor) => void;
}

export function DoctorTable({ doctors, onEdit, onToggleActive, onPermissions }: DoctorTableProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  const filtered = doctors.filter((doctor) => {
    const matchesSearch = doctor.name.toLowerCase().includes(search.toLowerCase());
    const matchesTab =
      tab === "all" ||
      (tab === "active" && doctor.active) ||
      (tab === "inactive" && !doctor.active);
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
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre..."
          />
        </div>
        <div className="flex gap-1 border border-gray-200 rounded-lg p-1">
          {tabs.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                tab === value
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No hay doctores" description="Ajusta los filtros o agrega un nuevo doctor." />
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Especialidad</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((doctor) => (
                <tr key={doctor.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{doctor.name}</td>
                  <td className="px-4 py-3 text-gray-500">{doctor.specialty ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{doctor.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge active={doctor.active} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(doctor)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onPermissions(doctor)}
                        className="text-sm text-gray-500 hover:text-gray-800 font-medium"
                      >
                        Permisos
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleActive(doctor)}
                        className="text-sm text-gray-500 hover:text-gray-800 font-medium"
                      >
                        {doctor.active ? "Desactivar" : "Activar"}
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
