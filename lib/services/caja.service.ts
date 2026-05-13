import { Prisma, CajaStatus, type Payment } from "@prisma/client";
import { cajaRepository } from "@/lib/repositories/caja.repository";
import { patientsRepository } from "@/lib/repositories/patients.repository";
import { patientsService } from "@/lib/services/patients.service";
import { createInvoice } from "@/lib/integrations/siigo/client";
import type { CajaRecordWithDetails, CreateCajaRecordInput, CreatePaymentInput } from "@/lib/validations/caja.schema";
import { NotFoundError, ConflictError } from "@/lib/errors";

export type CajaPage = {
  records: CajaRecordWithDetails[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
};

interface CajaService {
  list(options?: {
    search?: string;
    status?: string;
    patientId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<CajaPage>;
  get(id: string): Promise<CajaRecordWithDetails>;
  create(data: CreateCajaRecordInput): Promise<CajaRecordWithDetails>;
  addPayment(
    cajaRecordId: string,
    data: CreatePaymentInput
  ): Promise<{ record: CajaRecordWithDetails; payment: Payment }>;
}

function calculateStatus(total: Prisma.Decimal, balance: Prisma.Decimal): CajaStatus {
  if (balance.equals(new Prisma.Decimal(0))) return CajaStatus.PAGADO;
  if (balance.equals(total)) return CajaStatus.PENDIENTE;
  return CajaStatus.ABONO_PARCIAL;
}

const service: CajaService = {
  async list({ search, status, patientId, page = 1, pageSize = 20 } = {}) {
    const skip = (page - 1) * pageSize;
    const validStatuses = Object.values(CajaStatus) as string[];
    const cajaStatus =
      status && validStatuses.includes(status) ? (status as CajaStatus) : undefined;
    const { records, total } = await cajaRepository.findAll({
      search,
      status: cajaStatus,
      patientId,
      skip,
      take: pageSize,
    });
    const pages = Math.ceil(total / pageSize) || 1;
    return { records, total, page, pages, pageSize };
  },

  async get(id) {
    const record = await cajaRepository.findById(id);
    if (!record) throw new NotFoundError("Registro de caja no encontrado");
    return record;
  },

  async create(data) {
    const patient = await patientsRepository.findById(data.patientId);
    if (!patient) throw new NotFoundError("Paciente no encontrado");

    const total = new Prisma.Decimal(data.total);
    const initial = new Prisma.Decimal(data.initialPayment ?? 0);
    const balance = total.sub(initial);
    const status = calculateStatus(total, balance);

    const record = await cajaRepository.create({
      patientId: data.patientId,
      description: data.description,
      total: data.total,
      balance: balance.toNumber(),
      status,
    });

    if (data.initialPayment && data.initialPayment > 0 && data.paymentMethod) {
      await cajaRepository.addPayment({
        cajaRecordId: record.id,
        amount: data.initialPayment,
        method: data.paymentMethod,
      });
    }

    return (await cajaRepository.findById(record.id))!;
  },

  async addPayment(cajaRecordId, data) {
    const record = await cajaRepository.findById(cajaRecordId);
    if (!record) throw new NotFoundError("Registro de caja no encontrado");

    const currentBalance = new Prisma.Decimal(record.balance);
    const total = new Prisma.Decimal(record.total);
    const amount = new Prisma.Decimal(data.amount);

    if (amount.greaterThan(currentBalance)) {
      throw new ConflictError("El monto del abono supera el saldo pendiente");
    }

    const payment = await cajaRepository.addPayment({
      cajaRecordId,
      amount: data.amount,
      method: data.method,
    });

    const newBalance = currentBalance.sub(amount);
    const newStatus = calculateStatus(total, newBalance);
    await cajaRepository.updateBalance(cajaRecordId, newBalance, newStatus);

    if (newStatus === CajaStatus.PAGADO) {
      try {
        const [patient, payments] = await Promise.all([
          patientsService.get(record.patientId),
          cajaRepository.getPaymentsByRecord(cajaRecordId),
        ]);
        const result = await createInvoice({
          id: cajaRecordId,
          description: record.description,
          total: new Prisma.Decimal(record.total),
          patient: {
            firstName: patient.firstName,
            lastName: patient.lastName,
            idNumber: patient.idNumber,
            email: patient.email,
            phone: patient.phone,
          },
          payments: payments.map((p) => ({ amount: p.amount, method: p.method })),
        });
        await cajaRepository.updateInvoice(cajaRecordId, {
          invoiceId: result.invoiceId,
          invoiceNumber: result.invoiceNumber,
        });
      } catch (err) {
        console.error("[caja.service] Invoice creation failed for cajaRecordId=%s:", cajaRecordId, err);
      }
    }

    const updated = (await cajaRepository.findById(cajaRecordId))!;
    return { record: updated, payment };
  },
};

export const cajaService = service;
