"use client";

import { useEffect } from "react";
import type { PendingConfirmation } from "@/lib/integrations/anthropic/types";

interface ToolConfirmModalProps {
  confirmation: PendingConfirmation | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ToolConfirmModal({ confirmation, onConfirm, onCancel }: ToolConfirmModalProps) {
  useEffect(() => {
    if (!confirmation) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirmation, onCancel]);

  if (!confirmation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Confirmar acción</h2>
        <p className="text-sm text-gray-600 mb-1">El asistente quiere realizar la siguiente acción:</p>
        <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-800 mb-5">
          {confirmation.description}
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
