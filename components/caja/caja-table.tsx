"use client";

import { useState } from "react";
import type { CajaRecordWithDetails } from "@/lib/validations/caja.schema";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_CLASSES: Record<string, string> = {
  PENDIENTE: "bg-red-50 text-red-700",
  ABONO_PARCIAL: "bg-yellow-50 text-yellow-700",
  PAGADO: "bg-green-50 text-green-700",
};

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  ABONO_PARCIAL: "Abono Parcial",
  PAGADO: "Pagado",
};

const formatCOP = (value: string) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(parseFloat(value));

type TabOption = { label: string; value: string | null };
const TABS: TabOption[] = [
  { label: "Todos", value: null },
  { label: "Pendientes", value: "PENDIENTE" },
  { label: "Abono Parcial", value: "ABONO_PARCIAL" },
  { label: "Pagados", value: "PAGADO" },
];

interface CajaTableProps {
  records: CajaRecordWithDetails[];
  total: number;
  page: number;
  pages: number;
  onSearch: (search: string) => void;
  onFilterStatus: (status: string | null) => void;
  onPageChange: (page: number) => void;
  onViewDetail: (record: CajaRecordWithDetails) => void;
}

export function CajaTable({
  records,
  total,
  page,
  pages,
  onSearch,
  onFilterStatus,
  onPageChange,
  onViewDetail,
}: CajaTableProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  function handleTabClick(value: string | null) {
    setActiveTab(value);
    onFilterStatus(value);
  }

  return (
    <div className="space-y-3">
      <div className="w-72">
        <SearchInput value="" onChange={onSearch} placeholder="Buscar por nombre del paciente..." />
      </div>

      <div className="flex border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleTabClick(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.value
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {records.length === 0 ? (
        <EmptyState
          title="Sin registros"
          description="No hay registros de caja que coincidan con los filtros."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Paciente</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Factura</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {record.patient.lastName}, {record.patient.firstName}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {record.description}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {formatCOP(record.total)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatCOP(record.balance)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[record.status] ?? ""}`}
                      >
                        {STATUS_LABELS[record.status] ?? record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {record.status === "PAGADO" ? (
                        record.invoiceNumber ? (
                          <span className="text-green-700 font-medium">{record.invoiceNumber}</span>
                        ) : (
                          <span className="text-yellow-700">Pendiente</span>
                        )
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(record.createdAt).toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onViewDetail(record)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{total} registro{total !== 1 ? "s" : ""} en total</span>
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
