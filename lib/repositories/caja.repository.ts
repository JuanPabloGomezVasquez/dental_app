import { db } from "@/lib/db";
import type { CajaRecord, Payment, CajaStatus, PaymentMethod, Prisma } from "@prisma/client";
import type { CajaRecordWithDetails } from "@/lib/validations/caja.schema";

type CajaRecordFull = Prisma.CajaRecordGetPayload<{
  include: {
    patient: { select: { firstName: true; lastName: true } };
    payments: true;
  };
}>;

function toCajaRecordDto(record: CajaRecordFull): CajaRecordWithDetails {
  return {
    id: record.id,
    patientId: record.patientId,
    description: record.description,
    total: record.total.toString(),
    balance: record.balance.toString(),
    status: record.status,
    invoiceId: record.invoiceId,
    invoiceNumber: record.invoiceNumber,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    patient: { firstName: record.patient.firstName, lastName: record.patient.lastName },
    payments: record.payments.map((p) => ({
      id: p.id,
      amount: p.amount.toString(),
      method: p.method,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

const INCLUDE = {
  patient: { select: { firstName: true as const, lastName: true as const } },
  payments: { orderBy: { createdAt: "asc" as const } },
};

interface CajaRepository {
  findAll(options?: {
    organizationId: string;
    search?: string;
    status?: CajaStatus;
    patientId?: string;
    hasBalance?: boolean;
    skip?: number;
    take?: number;
  }): Promise<{ records: CajaRecordWithDetails[]; total: number }>;
  findById(id: string, organizationId: string): Promise<CajaRecordWithDetails | null>;
  create(data: {
    patientId: string;
    description: string;
    total: number;
    balance: number;
    status: CajaStatus;
    organizationId: string;
  }): Promise<CajaRecord>;
  updateBalance(id: string, newBalance: Prisma.Decimal, status: CajaStatus): Promise<CajaRecord>;
  updateInvoice(id: string, data: { invoiceId: string; invoiceNumber: string }): Promise<void>;
  addPayment(data: { cajaRecordId: string; amount: number; method: PaymentMethod }): Promise<Payment>;
  getPaymentsByRecord(cajaRecordId: string): Promise<Payment[]>;
  sumPaymentsInRange(organizationId: string, start: Date, end: Date): Promise<number>;
}

const repo: CajaRepository = {
  async findAll({ organizationId, search, status, patientId, hasBalance, skip = 0, take = 20 } = { organizationId: "" }) {
    const where: Prisma.CajaRecordWhereInput = {
      organizationId,
      ...(status ? { status } : {}),
      ...(patientId ? { patientId } : {}),
      ...(hasBalance ? { balance: { gt: 0 } } : {}),
      ...(search
        ? {
            patient: {
              OR: [
                { firstName: { contains: search, mode: "insensitive" as const } },
                { lastName: { contains: search, mode: "insensitive" as const } },
              ],
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      db.cajaRecord.findMany({
        where,
        include: INCLUDE,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      db.cajaRecord.count({ where }),
    ]);

    return { records: rows.map(toCajaRecordDto), total };
  },

  async findById(id, organizationId) {
    const record = await db.cajaRecord.findFirst({
      where: { id, organizationId },
      include: INCLUDE,
    });
    if (!record) return null;
    return toCajaRecordDto(record);
  },

  create(data) {
    return db.cajaRecord.create({ data });
  },

  updateBalance(id, newBalance, status) {
    return db.cajaRecord.update({ where: { id }, data: { balance: newBalance, status } });
  },

  async updateInvoice(id, data) {
    await db.cajaRecord.update({ where: { id }, data });
  },

  addPayment(data) {
    return db.payment.create({ data });
  },

  getPaymentsByRecord(cajaRecordId) {
    return db.payment.findMany({
      where: { cajaRecordId },
      orderBy: { createdAt: "asc" },
    });
  },

  async sumPaymentsInRange(organizationId, start, end) {
    const result = await db.payment.aggregate({
      _sum: { amount: true },
      where: {
        createdAt: { gte: start, lte: end },
        cajaRecord: { organizationId },
      },
    });
    return Number(result._sum.amount ?? 0);
  },
};

export const cajaRepository = repo;
