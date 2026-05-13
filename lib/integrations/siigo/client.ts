import type { Prisma, PaymentMethod } from "@prisma/client";
import { AppError } from "@/lib/errors";

export type InvoiceResult = {
  invoiceId: string;
  invoiceNumber: string;
  status: "ISSUED" | "PENDING" | "ERROR";
  pdfUrl?: string;
};

type InvoiceInput = {
  id: string;
  description: string;
  total: Prisma.Decimal;
  patient: {
    firstName: string;
    lastName: string;
    idNumber: string;
    email?: string | null;
    phone: string;
  };
  payments: { amount: Prisma.Decimal; method: PaymentMethod }[];
};

export async function createInvoice(cajaRecord: InvoiceInput): Promise<InvoiceResult> {
  if (process.env.NODE_ENV !== "production") {
    return {
      invoiceId: `MOCK-${cajaRecord.id}`,
      invoiceNumber: `MOCK-${Date.now()}`,
      status: "ISSUED",
    };
  }

  const apiKey = process.env.SIIGO_API_KEY;
  const accountId = process.env.SIIGO_ACCOUNT_ID;
  if (!apiKey || !accountId) {
    throw new AppError(
      "Integración de facturación no configurada. Configure SIIGO_API_KEY y SIIGO_ACCOUNT_ID.",
      500
    );
  }

  // Placeholder for production Siigo/Alegra integration.
  // Implement the actual API call here once the provider credentials are available.
  throw new AppError("Integración de facturación electrónica pendiente de configuración.", 501);
}
