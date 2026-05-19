import { AppModule } from "@prisma/client";
import { MODULE_METADATA, MODULE_ORDER } from "@/lib/module-metadata";

type OrgModuleRow = {
  module: AppModule;
  enabled: boolean;
};

type Props = {
  modules: OrgModuleRow[];
};

export function OrgModuleSettings({ modules }: Props) {
  const state = Object.fromEntries(modules.map((m) => [m.module, m.enabled])) as Record<AppModule, boolean>;

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
              <Icon size={18} className={enabled ? "text-purple-600" : "text-gray-400"} />
              <span className={`text-sm font-medium ${enabled ? "text-gray-900" : "text-gray-400"}`}>
                {meta.label}
              </span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {enabled ? "Activo" : "Inactivo"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
