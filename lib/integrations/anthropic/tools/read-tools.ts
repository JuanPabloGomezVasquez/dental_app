import type { Tool } from "@anthropic-ai/sdk/resources";
import { patientsService } from "@/lib/services/patients.service";
import { appointmentsService } from "@/lib/services/appointments.service";
import { inventoryService } from "@/lib/services/inventory.service";
import { cajaService } from "@/lib/services/caja.service";

export type ToolDefinition = {
  definition: Tool;
  execute: (input: Record<string, unknown>) => Promise<string>;
};

export type AgentContext = {
  organizationId: string;
  callerRole: "ADMIN" | "DOCTOR";
  callerDoctorId: string | null;
};

export function makeReadTools(ctx: AgentContext): ToolDefinition[] {
  return [
    {
      definition: {
        name: "read_pacientes",
        description: "Buscar y listar pacientes del consultorio. Soporta búsqueda por nombre o cédula.",
        input_schema: {
          type: "object",
          properties: {
            search: { type: "string", description: "Texto a buscar (nombre o cédula)" },
            page: { type: "number", description: "Página de resultados (default: 1)" },
          },
          required: [],
        },
      },
      execute: async (input) => {
        try {
          const search = typeof input["search"] === "string" ? input["search"] : undefined;
          const page = typeof input["page"] === "number" ? input["page"] : 1;
          const result = await patientsService.list({
            organizationId: ctx.organizationId,
            search,
            page,
            pageSize: 10,
          });
          return JSON.stringify({
            patients: result.patients.map((p) => ({
              id: p.id,
              firstName: p.firstName,
              lastName: p.lastName,
              idNumber: p.idNumber,
              phone: p.phone,
            })),
            total: result.total,
            page: result.page,
            pages: result.pages,
          });
        } catch (err) {
          return JSON.stringify({ error: err instanceof Error ? err.message : "Error al listar pacientes" });
        }
      },
    },
    {
      definition: {
        name: "read_citas",
        description: "Listar citas del consultorio. Puede filtrar por fecha y doctor.",
        input_schema: {
          type: "object",
          properties: {
            date: { type: "string", description: "Fecha en formato YYYY-MM-DD (default: hoy)" },
            doctorId: { type: "string", description: "ID del doctor para filtrar" },
          },
          required: [],
        },
      },
      execute: async (input) => {
        try {
          const dateStr =
            typeof input["date"] === "string"
              ? input["date"]
              : new Date().toISOString().split("T")[0]!;
          const filterDoctorId = typeof input["doctorId"] === "string" ? input["doctorId"] : undefined;

          const base = new Date(dateStr);
          const start = new Date(base);
          start.setUTCHours(0, 0, 0, 0);
          const end = new Date(base);
          end.setUTCHours(23, 59, 59, 999);

          const appointments = await appointmentsService.listByDateRange(
            start,
            end,
            ctx.organizationId,
            ctx.callerRole,
            ctx.callerDoctorId,
            filterDoctorId
          );
          return JSON.stringify({
            appointments: appointments.map((a) => ({
              id: a.id,
              date: a.date,
              patient: a.patient,
              doctor: a.doctor,
              procedure: a.procedure,
            })),
            total: appointments.length,
          });
        } catch (err) {
          return JSON.stringify({ error: err instanceof Error ? err.message : "Error al listar citas" });
        }
      },
    },
    {
      definition: {
        name: "read_inventario",
        description: "Listar insumos del inventario activo. Incluye alertas de stock bajo.",
        input_schema: {
          type: "object",
          properties: {
            search: { type: "string", description: "Texto a buscar en nombre del insumo" },
          },
          required: [],
        },
      },
      execute: async (input) => {
        try {
          const search = typeof input["search"] === "string" ? input["search"] : undefined;
          const items = await inventoryService.list({ organizationId: ctx.organizationId, search, active: true });
          return JSON.stringify({
            items: items.map((item) => ({
              id: item.id,
              commercialName: item.commercialName,
              sku: item.sku,
              quantity: Number(item.quantity),
              minStock: Number(item.minStock),
              unit: item.unit,
              lowStock: Number(item.quantity) < Number(item.minStock),
              category: item.category?.name,
            })),
            total: items.length,
          });
        } catch (err) {
          return JSON.stringify({ error: err instanceof Error ? err.message : "Error al listar inventario" });
        }
      },
    },
    {
      definition: {
        name: "read_caja",
        description: "Listar registros de caja con saldos pendientes.",
        input_schema: {
          type: "object",
          properties: {
            search: { type: "string", description: "Buscar por paciente o descripción" },
            status: {
              type: "string",
              description: "Filtrar por estado: PENDIENTE, ABONO_PARCIAL, PAGADO",
            },
            page: { type: "number", description: "Página de resultados (default: 1)" },
          },
          required: [],
        },
      },
      execute: async (input) => {
        try {
          const search = typeof input["search"] === "string" ? input["search"] : undefined;
          const status = typeof input["status"] === "string" ? input["status"] : undefined;
          const page = typeof input["page"] === "number" ? input["page"] : 1;
          const result = await cajaService.list({ organizationId: ctx.organizationId, search, status, page });
          return JSON.stringify({
            records: result.records.map((r) => ({
              id: r.id,
              patient: r.patient,
              description: r.description,
              total: r.total,
              balance: r.balance,
              status: r.status,
              createdAt: r.createdAt,
            })),
            total: result.total,
            page: result.page,
            pages: result.pages,
          });
        } catch (err) {
          return JSON.stringify({ error: err instanceof Error ? err.message : "Error al listar caja" });
        }
      },
    },
  ];
}
