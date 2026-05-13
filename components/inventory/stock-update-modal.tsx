"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { InventoryItemWithCategory } from "@/lib/repositories/inventory.repository";

interface StockUpdateModalProps {
  open: boolean;
  item: InventoryItemWithCategory | null;
  onSuccess: (item: InventoryItemWithCategory) => void;
  onClose: () => void;
}

export function StockUpdateModal({ open, item, onSuccess, onClose }: StockUpdateModalProps) {
  const [newQuantity, setNewQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setNewQuantity("");
      setReason("");
    }
  }, [open, item]);

  if (!open || !item) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/inventory/${item!.id}/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newQuantity: Number(newQuantity),
        reason: reason || undefined,
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
      <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Actualizar stock</h2>
        <p className="text-sm text-gray-500 mb-4">{item.commercialName}</p>
        <div className="bg-gray-50 rounded-md p-3 mb-4 text-sm">
          <span className="text-gray-600">Cantidad actual: </span>
          <span className="font-medium">
            {Number(item.quantity).toFixed(3)} {item.unit}
          </span>
          <span className="ml-4 text-gray-600">Stock mín.: </span>
          <span className="font-medium">{Number(item.minStock).toFixed(3)}</span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Nueva cantidad *</label>
            <input
              type="number"
              step="0.001"
              min="0"
              required
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Motivo del ajuste</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !newQuantity}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
