"use client";

import { useState, useTransition } from "react";
import { AppModule, MODULE_METADATA, MODULE_ORDER } from "@/lib/module-metadata";
import { toast } from "sonner";

type OrgModuleRow = {
  module: AppModule;
  enabled: boolean;
};

type Props = {
  modules: OrgModuleRow[];
};

export function OrgModuleSettings({ modules }: Props) {
  const [state, setState] = useState<Record<AppModule, boolean>>(
    () => Object.fromEntries(modules.map((m) => [m.module, m.enabled])) as Record<AppModule, boolean>
  );
  const [pending, startTransition] = useTransition();

  function toggle(module: AppModule, value: boolean) {
    const previous = state[module];
    setState((prev) => ({ ...prev, [module]: value }));

    startTransition(async () => {
      const res = await fetch("/api/admin/org-modules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, enabled: value }),
      });

      if (!res.ok) {
        setState((prev) => ({ ...prev, [module]: previous }));
        toast.error("Error al actualizar el módulo");
      } else {
        toast.success(`Módulo ${value ? "activado" : "desactivado"}`);
      }
    });
  }

  return (
    <div className="space-y-2">
      {MODULE_ORDER.map((mod) => {
        const meta = MODULE_METADATA[mod];
        const Icon = meta.icon;
        const enabled = state[mod] ?? false;

        return (
          <div
            key={mod}
            className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
          >
            <div className="flex items-center gap-3">
              <Icon size={18} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-900">{meta.label}</span>
            </div>
            <button
              role="switch"
              aria-checked={enabled}
              disabled={pending}
              onClick={() => toggle(mod, !enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 ${
                enabled ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
