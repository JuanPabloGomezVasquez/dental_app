import { verifySession, assertAdmin } from "@/lib/dal";
import { RipsExportForm } from "@/components/admin/rips-export-form";

export default async function RipsPage() {
  const session = await verifySession();
  assertAdmin(session.role);

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Exportar RIPS</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Reporte Individual de Prestación de Servicios de Salud — Res. 2275/2023
        </p>
      </div>

      <RipsExportForm />
    </div>
  );
}
