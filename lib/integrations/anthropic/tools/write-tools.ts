import type { Tool } from "@anthropic-ai/sdk/resources";
import { patientsService } from "@/lib/services/patients.service";
import { appointmentsService } from "@/lib/services/appointments.service";
import { inventoryService } from "@/lib/services/inventory.service";
import { cajaService } from "@/lib/services/caja.service";
import { doctorsService } from "@/lib/services/doctors.service";
import { proceduresService } from "@/lib/services/procedures.service";
import { createPatientSchema } from "@/lib/validations/patient.schema";
import { createAppointmentSchema } from "@/lib/validations/appointment.schema";
import { updateStockSchema } from "@/lib/validations/inventory.schema";
import { createCajaRecordSchema, createPaymentSchema } from "@/lib/validations/caja.schema";
import { createDoctorSchema } from "@/lib/validations/doctor.schema";
import { createProcedureSchema } from "@/lib/validations/procedure.schema";

export type WriteToolDefinition = {
  definition: Tool;
  requiresConfirmation: true;
  describeAction: (input: Record<string, unknown>) => string;
  execute: (input: Record<string, unknown>) => Promise<string>;
};

export const createPacienteTool: WriteToolDefinition = {
  requiresConfirmation: true,
  definition: {
    name: "create_paciente",
    description: "Crear un nuevo paciente en el sistema.",
    input_schema: {
      type: "object",
      properties: {
        firstName: { type: "string" },
        lastName: { type: "string" },
        idNumber: { type: "string", description: "Cédula o documento de identidad" },
        phone: { type: "string" },
        email: { type: "string" },
        birthDate: { type: "string", description: "Fecha de nacimiento YYYY-MM-DD" },
        habeaDataConsent: { type: "boolean" },
      },
      required: ["firstName", "lastName", "idNumber", "phone", "habeaDataConsent"],
    },
  },
  describeAction: (input) =>
    `Crear paciente: ${String(input["firstName"])} ${String(input["lastName"])} — CC ${String(input["idNumber"])}`,
  execute: async (input) => {
    try {
      const parsed = createPatientSchema.safeParse(input);
      if (!parsed.success) return JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" });
      const patient = await patientsService.create(parsed.data);
      return JSON.stringify({ success: true, patient: { id: patient.id, firstName: patient.firstName, lastName: patient.lastName } });
    } catch (err) {
      return JSON.stringify({ error: err instanceof Error ? err.message : "Error al crear paciente" });
    }
  },
};

export const createCitaTool: WriteToolDefinition = {
  requiresConfirmation: true,
  definition: {
    name: "create_cita",
    description: "Agendar una nueva cita para un paciente.",
    input_schema: {
      type: "object",
      properties: {
        patientId: { type: "string", description: "ID del paciente" },
        doctorId: { type: "string", description: "ID del doctor" },
        procedureId: { type: "string", description: "ID del procedimiento" },
        date: { type: "string", description: "Fecha y hora ISO 8601 (ej: 2026-05-10T09:00:00.000Z)" },
      },
      required: ["patientId", "doctorId", "procedureId", "date"],
    },
  },
  describeAction: (input) =>
    `Agendar cita — Paciente ID: ${String(input["patientId"])}, Doctor ID: ${String(input["doctorId"])}, Fecha: ${String(input["date"])}`,
  execute: async (input) => {
    try {
      const dateStr = String(input["date"] ?? "");
      if (isNaN(new Date(dateStr).getTime())) {
        return JSON.stringify({ error: "Fecha inválida. Use formato ISO 8601." });
      }
      const parsed = createAppointmentSchema.safeParse(input);
      if (!parsed.success) return JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" });
      const appointment = await appointmentsService.create(parsed.data);
      return JSON.stringify({ success: true, appointment: { id: appointment.id, date: appointment.date } });
    } catch (err) {
      return JSON.stringify({ error: err instanceof Error ? err.message : "Error al crear cita" });
    }
  },
};

export const updateInventarioTool: WriteToolDefinition = {
  requiresConfirmation: true,
  definition: {
    name: "update_inventario",
    description: "Actualizar la cantidad en stock de un insumo del inventario.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID del insumo" },
        newQuantity: { type: "number", description: "Nueva cantidad en stock" },
        reason: { type: "string", description: "Motivo del ajuste" },
      },
      required: ["id", "newQuantity"],
    },
  },
  describeAction: (input) =>
    `Actualizar stock del insumo ID ${String(input["id"])} a ${String(input["newQuantity"])} unidades`,
  execute: async (input) => {
    try {
      const id = String(input["id"] ?? "");
      const parsed = updateStockSchema.safeParse({ newQuantity: input["newQuantity"], reason: input["reason"] });
      if (!parsed.success) return JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" });
      const item = await inventoryService.updateStock(id, parsed.data);
      return JSON.stringify({ success: true, item: { id: item.id, commercialName: item.commercialName, quantity: Number(item.quantity) } });
    } catch (err) {
      return JSON.stringify({ error: err instanceof Error ? err.message : "Error al actualizar stock" });
    }
  },
};

export const createCajaTool: WriteToolDefinition = {
  requiresConfirmation: true,
  definition: {
    name: "create_caja",
    description: "Crear un nuevo registro de caja (cobro) para un paciente.",
    input_schema: {
      type: "object",
      properties: {
        patientId: { type: "string" },
        description: { type: "string", description: "Descripción del servicio" },
        total: { type: "number", description: "Valor total en COP" },
        initialPayment: { type: "number", description: "Pago inicial (opcional)" },
        paymentMethod: {
          type: "string",
          description: "Método de pago: EFECTIVO, TRANSFERENCIA, TARJETA_DEBITO, TARJETA_CREDITO",
        },
      },
      required: ["patientId", "description", "total"],
    },
  },
  describeAction: (input) =>
    `Crear registro de caja por $${String(input["total"])} — ${String(input["description"])}`,
  execute: async (input) => {
    try {
      const parsed = createCajaRecordSchema.safeParse(input);
      if (!parsed.success) return JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" });
      const record = await cajaService.create(parsed.data);
      return JSON.stringify({ success: true, record: { id: record.id, total: record.total, balance: record.balance, status: record.status } });
    } catch (err) {
      return JSON.stringify({ error: err instanceof Error ? err.message : "Error al crear registro de caja" });
    }
  },
};

export const createAbonoTool: WriteToolDefinition = {
  requiresConfirmation: true,
  definition: {
    name: "create_abono",
    description: "Registrar un abono a un registro de caja existente.",
    input_schema: {
      type: "object",
      properties: {
        cajaRecordId: { type: "string", description: "ID del registro de caja" },
        amount: { type: "number", description: "Monto del abono en COP" },
        method: {
          type: "string",
          description: "Método de pago: EFECTIVO, TRANSFERENCIA, TARJETA_DEBITO, TARJETA_CREDITO",
        },
      },
      required: ["cajaRecordId", "amount", "method"],
    },
  },
  describeAction: (input) =>
    `Registrar abono de $${String(input["amount"])} al registro ${String(input["cajaRecordId"])}`,
  execute: async (input) => {
    try {
      const cajaRecordId = String(input["cajaRecordId"] ?? "");
      const parsed = createPaymentSchema.safeParse({ amount: input["amount"], method: input["method"] });
      if (!parsed.success) return JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" });
      const result = await cajaService.addPayment(cajaRecordId, parsed.data);
      return JSON.stringify({ success: true, record: { id: result.record.id, balance: result.record.balance, status: result.record.status } });
    } catch (err) {
      return JSON.stringify({ error: err instanceof Error ? err.message : "Error al registrar abono" });
    }
  },
};

export const createDoctorTool: WriteToolDefinition = {
  requiresConfirmation: true,
  definition: {
    name: "create_doctor",
    description: "Registrar un nuevo doctor en el sistema.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        specialty: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
      },
      required: ["name"],
    },
  },
  describeAction: (input) => `Crear doctor: ${String(input["name"])}`,
  execute: async (input) => {
    try {
      const parsed = createDoctorSchema.safeParse(input);
      if (!parsed.success) return JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" });
      const doctor = await doctorsService.create(parsed.data);
      return JSON.stringify({ success: true, doctor: { id: doctor.id, name: doctor.name } });
    } catch (err) {
      return JSON.stringify({ error: err instanceof Error ? err.message : "Error al crear doctor" });
    }
  },
};

export const createProcedimientoTool: WriteToolDefinition = {
  requiresConfirmation: true,
  definition: {
    name: "create_procedimiento",
    description: "Registrar un nuevo procedimiento odontológico en el sistema.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
      },
      required: ["name"],
    },
  },
  describeAction: (input) => `Crear procedimiento: ${String(input["name"])}`,
  execute: async (input) => {
    try {
      const parsed = createProcedureSchema.safeParse(input);
      if (!parsed.success) return JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" });
      const procedure = await proceduresService.create(parsed.data);
      return JSON.stringify({ success: true, procedure: { id: procedure.id, name: procedure.name } });
    } catch (err) {
      return JSON.stringify({ error: err instanceof Error ? err.message : "Error al crear procedimiento" });
    }
  },
};

export const WRITE_TOOLS: WriteToolDefinition[] = [
  createPacienteTool,
  createCitaTool,
  updateInventarioTool,
  createCajaTool,
  createAbonoTool,
  createDoctorTool,
  createProcedimientoTool,
];
