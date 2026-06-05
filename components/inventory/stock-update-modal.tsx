"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { InventoryItemWithCategory } from "@/lib/repositories/inventory.repository";

interface StockUpdateModalProps {
  open: boolean;
  item: InventoryItemWithCategory | null;
  onSuccess: (item: InventoryItemWithCategory) => void;
  onClose: () => void;
}

function fmtQty(n: number) {
  return n.toLocaleString("es-CO", { maximumFractionDigits: 3 });
}

export function StockUpdateModal({ open, item, onSuccess, onClose }: StockUpdateModalProps) {
  const [newQuantity, setNewQuantity] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setNewQuantity("");
    }
  }, [open, item]);

  if (!open || !item) return null;

  const current = Number(item.quantity);
  const minStock = Number(item.minStock);
  const next = newQuantity !== "" ? Number(newQuantity) : null;
  const isLow = next !== null && next < minStock;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/inventory/${item!.id}/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newQuantity: Number(newQuantity),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      toast.error(body.error ?? "Error al actualizar stock");
      return;
    }
    const updated = (await res.json()) as InventoryItemWithCategory;
    toast.success("Stock actualizado");
    onSuccess(updated);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-900">Ajustar stock</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4 truncate">{item.commercialName}</p>

        <div className="flex gap-4 mb-4 p-3 bg-gray-50 rounded-lg text-sm">
          <div>
            <p className="text-xs text-gray-500">Actual</p>
            <p className="font-semibold text-gray-900">{fmtQty(current)} <span className="font-normal text-gray-500 text-xs">{item.unit.toLowerCase()}</span></p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Mínimo</p>
            <p className="font-semibold text-gray-900">{fmtQty(minStock)}</p>
          </div>
          {next !== null && (
            <div>
              <p className="text-xs text-gray-500">Nuevo</p>
              <p className={`font-semibold ${isLow ? "text-orange-600" : "text-green-700"}`}>{fmtQty(next)}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600">
              Nueva cantidad <span aria-hidden="true">*</span>
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              max="999999"
              required
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {isLow && (
            <p className="text-xs text-orange-600">Esta cantidad quedará por debajo del stock mínimo.</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !newQuantity}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
