"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PaymentMethod, type Payment } from "@prisma/client";
import {
  createPaymentSchema,
  type CreatePaymentInput,
  type CajaRecordWithDetails,
} from "@/lib/validations/caja.schema";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia bancaria",
  TARJETA_DEBITO: "Tarjeta débito",
  TARJETA_CREDITO: "Tarjeta crédito",
};

interface PaymentFormProps {
  cajaRecordId: string;
  currentBalance: string;
  onSuccess: (updated: { record: CajaRecordWithDetails; payment: Payment }) => void;
}

export function PaymentForm({ cajaRecordId, currentBalance, onSuccess }: PaymentFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreatePaymentInput>({ resolver: zodResolver(createPaymentSchema) });

  async function onSubmit(data: CreatePaymentInput) {
    const res = await fetch(`/api/caja/${cajaRecordId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      toast.error(body.error ?? "Error al registrar el abono");
      return;
    }
    const updated = (await res.json()) as { record: CajaRecordWithDetails; payment: Payment };
    toast.success("Abono registrado");
    reset();
    onSuccess(updated);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600">Monto del abono *</label>
          <input
            type="number"
            step="1"
            min="1"
            max={parseFloat(currentBalance)}
            {...register("amount", { valueAsNumber: true })}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
          {errors.amount && (
            <p role="alert" className="text-xs text-red-600 mt-0.5">{errors.amount.message}</p>
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Método de pago *</label>
          <select
            {...register("method")}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">Seleccionar...</option>
            {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>{PAYMENT_LABELS[m]}</option>
            ))}
          </select>
          {errors.method && (
            <p role="alert" className="text-xs text-red-600 mt-0.5">{errors.method.message}</p>
          )}
        </div>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? "Registrando..." : "Registrar abono"}
      </button>
    </form>
  );
}
