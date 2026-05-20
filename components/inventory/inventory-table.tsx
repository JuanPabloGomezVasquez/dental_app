"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { InventoryItemWithCategory } from "@/lib/repositories/inventory.repository";
import { StatusBadge } from "@/components/ui/status-badge";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";

interface InventoryTableProps {
  items: InventoryItemWithCategory[];
  categories: { id: string; name: string }[];
  onEdit: (item: InventoryItemWithCategory) => void;
  onUpdateStock: (item: InventoryItemWithCategory) => void;
  onToggleActive: (item: InventoryItemWithCategory) => void;
}

type Tab = "all" | "active" | "inactive";

export function InventoryTable({
  items,
  categories,
  onEdit,
  onUpdateStock,
  onToggleActive,
}: InventoryTableProps) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  const filtered = items.filter((item) => {
    const term = search.toLowerCase();
    const matchesSearch =
      !search ||
      item.commercialName.toLowerCase().includes(term) ||
      item.sku.toLowerCase().includes(term);
    const matchesCategory = !categoryId || item.categoryId === categoryId;
    const matchesTab =
      tab === "all" || (tab === "active" ? item.active : !item.active);
    return matchesSearch && matchesCategory && matchesTab;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre o SKU..."
          />
        </div>
        <select
          aria-label="Filtrar por categoría"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="flex border-b border-gray-200">
        {(["all", "active", "inactive"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "all" ? "Todos" : t === "active" ? "Activos" : "Inactivos"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Sin insumos" description="No hay insumos que coincidan con los filtros." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium text-gray-700 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">SKU</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3 text-right">Stock mín.</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => {
                const isLow = item.active && Number(item.quantity) < Number(item.minStock);
                return (
                  <tr key={item.id} className={isLow ? "bg-orange-50" : "bg-white hover:bg-gray-50"}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.commercialName}</p>
                      {item.genericName && (
                        <p className="text-xs text-gray-600">{item.genericName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.sku}</td>
                    <td className="px-4 py-3 text-gray-600">{item.category.name}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 justify-end">
                        {isLow && <AlertTriangle size={14} className="text-orange-500" />}
                        {Number(item.quantity).toFixed(3)} {item.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {Number(item.minStock).toFixed(3)}
                    </td>
                    <td className="px-4 py-3"><StatusBadge active={item.active} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => onEdit(item)} className="text-xs text-blue-600 hover:underline">Editar</button>
                        <button onClick={() => onUpdateStock(item)} className="text-xs text-gray-600 hover:underline">Stock</button>
                        <button
                          onClick={() => onToggleActive(item)}
                          className={`text-xs hover:underline ${item.active ? "text-red-700" : "text-green-700"}`}
                        >
                          {item.active ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
