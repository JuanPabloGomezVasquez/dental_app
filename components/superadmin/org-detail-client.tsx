"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppModule } from "@prisma/client";
import { MODULE_METADATA, MODULE_ORDER } from "@/lib/module-metadata";
import { toast } from "sonner";
import { Building2, Users, Stethoscope, UserSquare2, Power } from "lucide-react";

type ModuleState = { module: AppModule; enabled: boolean };

type OrgDetail = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: Date;
  userCount: number;
  doctorCount: number;
  patientCount: number;
  modules: ModuleState[];
};

export function OrgDetailClient({ org }: { org: OrgDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modules, setModules] = useState<ModuleState[]>(org.modules);
  const [active, setActive] = useState(org.active);

  async function toggleModule(module: AppModule, enabled: boolean) {
    const prev = modules;
    setModules((m) => m.map((x) => (x.module === module ? { ...x, enabled } : x)));

    const res = await fetch(`/api/superadmin/organizations/${org.id}/modules`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module, enabled }),
    });

    if (!res.ok) {
      setModules(prev);
      toast.error("Error al actualizar el módulo");
    } else {
      toast.success(enabled ? "Módulo activado" : "Módulo desactivado");
    }
  }

  function toggleOrgActive() {
    startTransition(async () => {
      const newActive = !active;
      const res = await fetch(`/api/superadmin/organizations/${org.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newActive }),
      });

      if (!res.ok) {
        toast.error("Error al actualizar la organización");
        return;
      }

      setActive(newActive);
      toast.success(newActive ? "Organización activada" : "Organización suspendida");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Building2 size={20} className="text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900">{org.name}</h1>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                  }`}
                >
                  {active ? "Activa" : "Suspendida"}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                slug: <code className="text-xs bg-gray-100 px-1 rounded">{org.slug}</code>
              </p>
            </div>
          </div>

          <button
            onClick={toggleOrgActive}
            disabled={isPending}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-60 ${
              active
                ? "border-red-200 text-red-600 hover:bg-red-50"
                : "border-green-200 text-green-700 hover:bg-green-50"
            }`}
          >
            <Power size={14} />
            {active ? "Suspender" : "Activar"}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
          <Stat icon={<Users size={14} />} label="Usuarios" value={org.userCount} />
          <Stat icon={<Stethoscope size={14} />} label="Doctores" value={org.doctorCount} />
          <Stat icon={<UserSquare2 size={14} />} label="Pacientes" value={org.patientCount} />
        </div>
      </div>

      {/* Module configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Módulos contratados</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Solo los módulos activados aquí son visibles para el admin y doctores de esta clínica.
          </p>
        </div>

        <div className="space-y-2">
          {MODULE_ORDER.map((mod) => {
            const state = modules.find((m) => m.module === mod);
            const enabled = state?.enabled ?? false;
            const meta = MODULE_METADATA[mod];
            const Icon = meta.icon;

            return (
              <div
                key={mod}
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon size={15} className={enabled ? "text-purple-600" : "text-gray-400"} />
                  <span className={`text-sm font-medium ${enabled ? "text-gray-900" : "text-gray-500"}`}>
                    {meta.label}
                  </span>
                </div>
                <button
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`${enabled ? "Desactivar" : "Activar"} ${meta.label}`}
                  onClick={() => toggleModule(mod, !enabled)}
                  className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 ${
                    enabled ? "bg-purple-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5 text-gray-500 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
