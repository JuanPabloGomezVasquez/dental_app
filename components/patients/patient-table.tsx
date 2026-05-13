"use client";

import Link from "next/link";
import type { Patient } from "@prisma/client";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";

interface PatientTableProps {
  patients: Patient[];
  total: number;
  page: number;
  pages: number;
  onSearch: (search: string) => void;
  onPageChange: (page: number) => void;
  onEdit: (patient: Patient) => void;
  onViewHistory: (patient: Patient) => void;
}

export function PatientTable({
  patients,
  total,
  page,
  pages,
  onSearch,
  onPageChange,
  onEdit,
  onViewHistory,
}: PatientTableProps) {
  return (
    <div className="space-y-4">
      <div className="w-72">
        <SearchInput
          value=""
          onChange={onSearch}
          placeholder="Buscar por nombre, apellido o cédula..."
        />
      </div>

      {patients.length === 0 ? (
        <EmptyState
          title="No hay pacientes"
          description="Ajusta la búsqueda o registra un nuevo paciente."
        />
      ) : (
        <>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre completo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">N° Identificación</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Teléfono</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Correo</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {`${patient.lastName}, ${patient.firstName}`}
                        {!patient.habeaDataConsent && (
                          <span
                            className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0"
                            title="Sin consentimiento Habeas Data"
                            aria-label="Sin consentimiento Habeas Data"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{patient.idNumber}</td>
                    <td className="px-4 py-3 text-gray-500">{patient.phone}</td>
                    <td className="px-4 py-3 text-gray-500">{patient.email ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/patients/${patient.id}`}
                          onClick={() => onViewHistory(patient)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Ver HC
                        </Link>
                        <button
                          type="button"
                          onClick={() => onEdit(patient)}
                          className="text-sm text-gray-500 hover:text-gray-800 font-medium"
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{total} paciente{total !== 1 ? "s" : ""} en total</span>
            <div className="flex items-center gap-3">
              <span>Página {page} de {pages}</span>
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= pages}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
