"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { Doctor } from "@prisma/client";
import { AppModule, MODULE_METADATA, MODULE_ORDER } from "@/lib/module-metadata";

type ModuleStatus = {
  module: AppModule;
  enabled: boolean;
  orgEnabled: boolean;
};

type Props = {
  doctor: Doctor | null;
  onClose: () => void;
};

export function DoctorPermissionsPanel({ doctor, onClose }: Props) {
  const [modules, setModules] = useState<ModuleStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!doctor) return;
    setLoading(true);
    fetch(`/api/admin/doctors/${doctor.id}/modules`)
      .then((r) => r.json())
      .then((data: ModuleStatus[]) => {
        setModules(MODULE_ORDER.map((mod) => data.find((m) => m.module === mod) ?? { module: mod, enabled: false, orgEnabled: false }));
      })
      .catch(() => toast.error("Error al cargar permisos"))
      .finally(() => setLoading(false));
  }, [doctor]);

  function toggle(module: AppModule, value: boolean) {
    const previous = modules;
    setModules((prev) =>
      prev.map((m) => (m.module === module ? { ...m, enabled: value } : m))
    );

    startTransition(async () => {
      const res = await fetch(`/api/admin/doctors/${doctor!.id}/modules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, enabled: value }),
      });

      if (!res.ok) {
        setModules(previous);
        toast.error("Error al actualizar permiso");
      } else {
        toast.success(`Permiso ${value ? "activado" : "desactivado"}`);
      }
    });
  }

  if (!doctor) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="fixed right-0 top-0 z-50 h-full w-80 bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-900">{doctor.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">Permisos de módulos</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>
          ) : (
            <div className="space-y-2">
              {modules.map(({ module, enabled, orgEnabled }) => {
                const meta = MODULE_METADATA[module];
                const Icon = meta.icon;
                const disabled = !orgEnabled || pending;

                return (
                  <div
                    key={module}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      orgEnabled ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon size={16} className={orgEnabled ? "text-gray-500" : "text-gray-300"} />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${orgEnabled ? "text-gray-900" : "text-gray-400"}`}>
                          {meta.label}
                        </p>
                        {!orgEnabled && (
                          <p className="text-xs text-gray-400">No disponible en la organización</p>
                        )}
                      </div>
                    </div>
                    <button
                      role="switch"
                      aria-checked={enabled}
                      disabled={disabled}
                      onClick={() => toggle(module, !enabled)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed ${
                        enabled ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          enabled ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
