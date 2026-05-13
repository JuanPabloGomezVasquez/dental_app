"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Procedure } from "@prisma/client";
import { ProcedureTable } from "@/components/admin/procedure-table";
import { ProcedureForm } from "@/components/admin/procedure-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ProceduresPageClientProps {
  initialProcedures: Procedure[];
}

export function ProceduresPageClient({ initialProcedures }: ProceduresPageClientProps) {
  const [procedures, setProcedures] = useState<Procedure[]>(initialProcedures);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [procedureToToggle, setProcedureToToggle] = useState<Procedure | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  function handleEdit(procedure: Procedure) {
    setSelectedProcedure(procedure);
    setIsFormOpen(true);
  }

  function handleNewProcedure() {
    setSelectedProcedure(null);
    setIsFormOpen(true);
  }

  function handleFormSuccess(saved: Procedure) {
    setProcedures((prev) =>
      prev.some((p) => p.id === saved.id)
        ? prev.map((p) => (p.id === saved.id ? saved : p))
        : [...prev, saved]
    );
  }

  function handleToggleActive(procedure: Procedure) {
    setProcedureToToggle(procedure);
    setIsConfirmOpen(true);
  }

  async function handleConfirmToggle() {
    if (!procedureToToggle) return;
    const newActive = !procedureToToggle.active;

    const res = await fetch(`/api/admin/procedures/${procedureToToggle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: newActive }),
    });

    const json: unknown = await res.json();

    if (!res.ok) {
      const message =
        typeof json === "object" && json !== null && "error" in json
          ? String((json as Record<string, unknown>).error)
          : "Error al actualizar";
      toast.error(message);
    } else {
      setProcedures((prev) =>
        prev.map((p) => (p.id === procedureToToggle.id ? (json as Procedure) : p))
      );
      toast.success(newActive ? "Procedimiento activado" : "Procedimiento desactivado");
    }

    setIsConfirmOpen(false);
    setProcedureToToggle(null);
  }

  const isDeactivating = procedureToToggle ? procedureToToggle.active : false;

  return (
    <>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Procedimientos</h1>
            <p className="text-sm text-gray-500 mt-0.5">{procedures.length} registrados</p>
          </div>
          <button
            type="button"
            onClick={handleNewProcedure}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Nuevo Procedimiento
          </button>
        </div>

        <ProcedureTable
          procedures={procedures}
          onEdit={handleEdit}
          onToggleActive={handleToggleActive}
        />
      </div>

      <ProcedureForm
        open={isFormOpen}
        procedure={selectedProcedure}
        onSuccess={handleFormSuccess}
        onClose={() => setIsFormOpen(false)}
      />

      <ConfirmDialog
        open={isConfirmOpen}
        title={isDeactivating ? "Desactivar procedimiento" : "Activar procedimiento"}
        description={
          isDeactivating
            ? `¿Desactivar "${procedureToToggle?.name ?? "este procedimiento"}"? No estará disponible para nuevas citas.`
            : `¿Activar "${procedureToToggle?.name ?? "este procedimiento"}"?`
        }
        confirmLabel={isDeactivating ? "Desactivar" : "Activar"}
        destructive={isDeactivating}
        onConfirm={handleConfirmToggle}
        onCancel={() => {
          setIsConfirmOpen(false);
          setProcedureToToggle(null);
        }}
      />
    </>
  );
}
