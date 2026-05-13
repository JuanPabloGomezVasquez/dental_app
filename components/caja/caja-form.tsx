"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PaymentMethod } from "@prisma/client";
import {
  createCajaRecordSchema,
  type CreateCajaRecordInput,
  type CajaRecordWithDetails,
} from "@/lib/validations/caja.schema";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia bancaria",
  TARJETA_DEBITO: "Tarjeta débito",
  TARJETA_CREDITO: "Tarjeta crédito",
};

type PatientOption = { id: string; firstName: string; lastName: string };

interface CajaFormProps {
  open: boolean;
  onSuccess: (record: CajaRecordWithDetails) => void;
  onClose: () => void;
}

export function CajaForm({ open, onSuccess, onClose }: CajaFormProps) {
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCajaRecordInput>({ resolver: zodResolver(createCajaRecordSchema) });

  const initialPaymentValue = watch("initialPayment");
  const showPaymentMethod = !!initialPaymentValue && Number(initialPaymentValue) > 0;

  useEffect(() => {
    fetch("/api/patients?pageSize=200")
      .then((r) => r.json())
      .then((data: { patients: PatientOption[] }) => setPatients(data.patients))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  if (!open) return null;

  async function onSubmit(data: CreateCajaRecordInput) {
    const res = await fetch("/api/caja", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      toast.error(body.error ?? "Error al crear el registro");
      return;
    }
    const record = (await res.json()) as CajaRecordWithDetails;
    toast.success("Registro creado");
    onSuccess(record);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Nuevo registro de caja</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Paciente *</label>
            <select
              {...register("patientId")}
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">Seleccionar paciente...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lastName}, {p.firstName}
                </option>
              ))}
            </select>
            {errors.patientId && (
              <p role="alert" className="text-xs text-red-600 mt-0.5">{errors.patientId.message}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Descripción *</label>
            <textarea
              {...register("description")}
              rows={2}
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm resize-none"
            />
            {errors.description && (
              <p role="alert" className="text-xs text-red-600 mt-0.5">{errors.description.message}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Total (COP) *</label>
            <input
              type="number"
              step="1"
              min="1"
              {...register("total", { valueAsNumber: true })}
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            {errors.total && (
              <p role="alert" className="text-xs text-red-600 mt-0.5">{errors.total.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Pago inicial (opcional)</label>
              <input
                type="number"
                step="1"
                min="0"
                {...register("initialPayment", {
                  setValueAs: (v: string) => (v === "" ? undefined : parseFloat(v)),
                })}
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            {showPaymentMethod && (
              <div>
                <label className="text-xs font-medium text-gray-600">Método de pago</label>
                <select
                  {...register("paymentMethod")}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => (
                    <option key={m} value={m}>{PAYMENT_LABELS[m]}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Crear registro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
