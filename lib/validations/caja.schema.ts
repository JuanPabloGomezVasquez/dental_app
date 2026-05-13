import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

export const createCajaRecordSchema = z.object({
  patientId: z.string().min(1, "Paciente requerido"),
  description: z.string().min(1, "Descripción requerida").max(500),
  total: z.number().positive("El total debe ser mayor a 0"),
  initialPayment: z.number().min(0, "El pago inicial no puede ser negativo").optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
});

export const createPaymentSchema = z.object({
  amount: z.number().positive("El monto debe ser mayor a 0"),
  method: z.nativeEnum(PaymentMethod),
});

export type CreateCajaRecordInput = z.infer<typeof createCajaRecordSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export type CajaRecordWithDetails = {
  id: string;
  patientId: string;
  description: string;
  total: string;
  balance: string;
  status: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  createdAt: string;
  updatedAt: string;
  patient: { firstName: string; lastName: string };
  payments: { id: string; amount: string; method: string; createdAt: string }[];
};
