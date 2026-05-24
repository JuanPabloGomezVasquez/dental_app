import Link from "next/link";
import { verifySuperAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { auditRepository } from "@/lib/repositories/audit.repository";
import type { AuditAction } from "@prisma/client";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 25;

const ACTION_LABELS: Record<AuditAction, string> = {
  LOGIN: "Inicio de sesión",
  LOGOUT: "Cierre de sesión",
  LOGIN_FAILED: "Intento fallido",
  PATIENT_VIEWED: "Paciente visto",
  PATIENT_CREATED: "Paciente creado",
  PATIENT_UPDATED: "Paciente actualizado",
  PATIENT_ANONYMIZED: "Paciente anonimizado",
  PATIENT_EXPORTED: "Paciente exportado",
  CLINICAL_NOTE_CREATED: "Nota clínica creada",
  CLINICAL_NOTE_DELETED: "Nota clínica eliminada",
  FILE_UPLOADED: "Archivo subido",
  FILE_DELETED: "Archivo eliminado",
};

const ACTION_COLORS: Record<AuditAction, string> = {
  LOGIN: "bg-green-100 text-green-800",
  LOGOUT: "bg-gray-100 text-gray-700",
  LOGIN_FAILED: "bg-red-100 text-red-800",
  PATIENT_VIEWED: "bg-blue-100 text-blue-800",
  PATIENT_CREATED: "bg-blue-100 text-blue-800",
  PATIENT_UPDATED: "bg-blue-100 text-blue-800",
  PATIENT_ANONYMIZED: "bg-orange-100 text-orange-800",
  PATIENT_EXPORTED: "bg-orange-100 text-orange-800",
  CLINICAL_NOTE_CREATED: "bg-purple-100 text-purple-800",
  CLINICAL_NOTE_DELETED: "bg-purple-100 text-purple-800",
  FILE_UPLOADED: "bg-amber-100 text-amber-800",
  FILE_DELETED: "bg-amber-100 text-amber-800",
};

const ALL_ACTIONS = Object.keys(ACTION_LABELS) as AuditAction[];

interface PageProps {
  searchParams: Promise<{
    action?: string;
    organizationId?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

function buildUrl(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const qs = sp.toString();
  return `/superadmin/audit-logs${qs ? `?${qs}` : ""}`;
}

export default async function AuditLogsPage({ searchParams }: PageProps) {
  await verifySuperAdmin();

  const {
    action: actionParam,
    organizationId: orgParam,
    from: fromParam,
    to: toParam,
    page: pageParam,
  } = await searchParams;

  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);
  const action = ALL_ACTIONS.includes(actionParam as AuditAction)
    ? (actionParam as AuditAction)
    : undefined;
  const from = fromParam ? new Date(`${fromParam}T00:00:00`) : undefined;
  const to = toParam ? new Date(`${toParam}T23:59:59`) : undefined;
  const orgId = orgParam || undefined;

  const [{ logs, total }, organizations] = await Promise.all([
    auditRepository.findMany({ action, organizationId: orgId, from, to, page, pageSize: PAGE_SIZE }),
    db.organization.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const orgMap = new Map(organizations.map((o) => [o.id, o.name]));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const currentFilters = {
    action: actionParam,
    organizationId: orgParam,
    from: fromParam,
    to: toParam,
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Logs de auditoría</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Registro de accesos y operaciones sobre datos sensibles en todas las clínicas.
        </p>
      </div>

      {/* Filters */}
      <form method="GET" action="/superadmin/audit-logs" className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Acción</label>
            <select
              name="action"
              defaultValue={actionParam ?? ""}
              className="h-9 rounded-lg border border-gray-300 text-sm px-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todas</option>
              {ALL_ACTIONS.map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a]}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Organización</label>
            <select
              name="organizationId"
              defaultValue={orgParam ?? ""}
              className="h-9 rounded-lg border border-gray-300 text-sm px-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todas</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Desde</label>
            <input
              type="date"
              name="from"
              defaultValue={fromParam ?? ""}
              className="h-9 rounded-lg border border-gray-300 text-sm px-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Hasta</label>
            <input
              type="date"
              name="to"
              defaultValue={toParam ?? ""}
              className="h-9 rounded-lg border border-gray-300 text-sm px-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <input type="hidden" name="page" value="1" />

          <div className="flex gap-2">
            <button
              type="submit"
              className="h-9 px-4 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              Filtrar
            </button>
            <Link
              href="/superadmin/audit-logs"
              className="h-9 px-4 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center"
            >
              Limpiar
            </Link>
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {total === 0 ? "Sin resultados" : `${total.toLocaleString("es-CO")} registro${total === 1 ? "" : "s"}`}
          </span>
          <span className="text-xs text-gray-400">Página {page} de {totalPages}</span>
        </div>

        {logs.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">No hay registros que coincidan con los filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha / Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Acción</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Recurso</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Organización</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">
                      {log.createdAt.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      {" "}
                      {log.createdAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-gray-800 max-w-[200px] truncate">
                      {log.userEmail}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action]}`}>
                        {ACTION_LABELS[log.action]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                      {log.resource ? `${log.resource}${log.resourceId ? `/${log.resourceId.slice(0, 8)}` : ""}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {log.organizationId ? (orgMap.get(log.organizationId) ?? log.organizationId.slice(0, 8)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                      {log.ipAddress ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            {page > 1 ? (
              <Link
                href={buildUrl({ ...currentFilters, page: String(page - 1) })}
                className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft size={16} />
                Anterior
              </Link>
            ) : (
              <span className="text-sm text-gray-300 flex items-center gap-1">
                <ChevronLeft size={16} />
                Anterior
              </span>
            )}

            <span className="text-xs text-gray-400">
              {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} de {total.toLocaleString("es-CO")}
            </span>

            {page < totalPages ? (
              <Link
                href={buildUrl({ ...currentFilters, page: String(page + 1) })}
                className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Siguiente
                <ChevronRight size={16} />
              </Link>
            ) : (
              <span className="text-sm text-gray-300 flex items-center gap-1">
                Siguiente
                <ChevronRight size={16} />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
