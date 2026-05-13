"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { InventoryItemWithCategory } from "@/lib/repositories/inventory.repository";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { InventoryForm } from "@/components/inventory/inventory-form";
import { StockUpdateModal } from "@/components/inventory/stock-update-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface InventoryPageClientProps {
  initialItems: InventoryItemWithCategory[];
  categories: { id: string; name: string }[];
}

export function InventoryPageClient({ initialItems, categories }: InventoryPageClientProps) {
  const [items, setItems] = useState(initialItems);
  const [selectedItem, setSelectedItem] = useState<InventoryItemWithCategory | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [itemToToggle, setItemToToggle] = useState<InventoryItemWithCategory | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  function handleFormSuccess(item: InventoryItemWithCategory) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [item, ...prev];
    });
  }

  function handleStockSuccess(item: InventoryItemWithCategory) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
  }

  async function handleToggleConfirm() {
    if (!itemToToggle) return;
    const newActive = !itemToToggle.active;
    const res = await fetch(`/api/inventory/${itemToToggle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: newActive }),
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((i) => (i.id === itemToToggle.id ? { ...i, active: newActive } : i))
      );
      toast.success(newActive ? "Insumo activado" : "Insumo desactivado");
    } else {
      toast.error("Error al cambiar el estado");
    }
    setIsConfirmOpen(false);
    setItemToToggle(null);
  }

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de insumos y materiales</p>
        </div>
        <button
          onClick={() => { setSelectedItem(null); setIsFormOpen(true); }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Nuevo insumo
        </button>
      </div>

      <InventoryTable
        items={items}
        categories={categories}
        onEdit={(item) => { setSelectedItem(item); setIsFormOpen(true); }}
        onUpdateStock={(item) => { setSelectedItem(item); setIsStockModalOpen(true); }}
        onToggleActive={(item) => { setItemToToggle(item); setIsConfirmOpen(true); }}
      />

      <InventoryForm
        open={isFormOpen}
        item={selectedItem}
        categories={categories}
        onSuccess={handleFormSuccess}
        onClose={() => setIsFormOpen(false)}
      />

      <StockUpdateModal
        open={isStockModalOpen}
        item={selectedItem}
        onSuccess={handleStockSuccess}
        onClose={() => setIsStockModalOpen(false)}
      />

      <ConfirmDialog
        open={isConfirmOpen}
        title={itemToToggle?.active ? "Desactivar insumo" : "Activar insumo"}
        description={
          itemToToggle?.active
            ? `¿Deseas desactivar "${itemToToggle.commercialName}"?`
            : `¿Deseas activar "${itemToToggle?.commercialName}"?`
        }
        confirmLabel={itemToToggle?.active ? "Desactivar" : "Activar"}
        onConfirm={handleToggleConfirm}
        onCancel={() => { setIsConfirmOpen(false); setItemToToggle(null); }}
        destructive={itemToToggle?.active}
      />
    </div>
  );
}
