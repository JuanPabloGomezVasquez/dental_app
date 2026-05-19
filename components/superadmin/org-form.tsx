"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppModule } from "@prisma/client";
import { MODULE_METADATA, MODULE_ORDER } from "@/lib/module-metadata";
import { toast } from "sonner";

const MODULE_LABELS: Record<AppModule, string> = Object.fromEntries(
  Object.entries(MODULE_METADATA).map(([k, v]) => [k, v.label])
) as Record<AppModule, string>;

export function OrgForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [selectedModules, setSelectedModules] = useState<AppModule[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggleModule(mod: AppModule) {
    setSelectedModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name") as string,
      slug: fd.get("slug") as string,
      adminName: fd.get("adminName") as string,
      adminEmail: fd.get("adminEmail") as string,
      adminPassword: fd.get("adminPassword") as string,
      modules: selectedModules,
    };

    const res = await fetch("/api/superadmin/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setPending(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Error al crear la organización");
      return;
    }

    toast.success("Organización creada exitosamente");
    router.push("/superadmin/organizations");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Datos de la clínica</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Nombre
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder="Clínica Dental Norte"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1.5">
              Slug (URL único)
            </label>
            <input
              id="slug"
              name="slug"
              required
              placeholder="clinica-dental-norte"
              pattern="^[a-z0-9-]+"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-400 mt-1">Solo minúsculas, números y guiones</p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Administrador de la clínica</h2>

        <div>
          <label htmlFor="adminName" className="block text-sm font-medium text-gray-700 mb-1.5">
            Nombre completo
          </label>
          <input
            id="adminName"
            name="adminName"
            required
            placeholder="Dr. Juan Pérez"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              id="adminEmail"
              name="adminEmail"
              type="email"
              required
              placeholder="admin@clinica.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
              Contraseña inicial
            </label>
            <input
              id="adminPassword"
              name="adminPassword"
              type="password"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Módulos contratados</h2>
        <p className="text-xs text-gray-500 mb-4">
          El admin de la clínica solo verá y podrá usar los módulos que actives aquí.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {MODULE_ORDER.map((mod) => {
            const active = selectedModules.includes(mod);
            return (
              <button
                key={mod}
                type="button"
                onClick={() => toggleModule(mod)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  active
                    ? "border-purple-300 bg-purple-50 text-purple-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs ${
                    active ? "bg-purple-600 border-purple-600 text-white" : "border-gray-300"
                  }`}
                >
                  {active && "✓"}
                </span>
                {MODULE_LABELS[mod]}
              </button>
            );
          })}
        </div>
      </section>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-60 transition-colors"
        >
          {pending ? "Creando..." : "Crear organización"}
        </button>
      </div>
    </form>
  );
}
