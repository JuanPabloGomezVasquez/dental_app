"use client";

import { useState, useEffect } from "react";
import type { Payment } from "@prisma/client";
import type { CajaRecordWithDetails } from "@/lib/validations/caja.schema";
import { PaymentForm } from "@/components/caja/payment-form";

const STATUS_CLASSES: Record<string, string> = {
  PENDIENTE: "bg-red-50 text-red-700",
  ABONO_PARCIAL: "bg-yellow-50 text-yellow-700",
  PAGADO: "bg-green-50 text-green-700",
};

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  ABONO_PARCIAL: "Abono Parcial",
  PAGADO: "Pagado",
};

const PAYMENT_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA_DEBITO: "Débito",
  TARJETA_CREDITO: "Crédito",
};

const formatCOP = (value: string) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(parseFloat(value));

interface CajaDetailProps {
  open: boolean;
  record: CajaRecordWithDetails | null;
  onPaymentSuccess: (updated: CajaRecordWithDetails) => void;
  onClose: () => void;
}

export function CajaDetail({ open, record, onPaymentSuccess, onClose }: CajaDetailProps) {
  const [current, setCurrent] = useState<CajaRecordWithDetails | null>(record);

  useEffect(() => {
    setCurrent(record);
  }, [record]);

  if (!open || !current) return null;

  function handlePaymentSuccess({
    record: updated,
  }: {
    record: CajaRecordWithDetails;
    payment: Payment;
  }) {
    setCurrent(updated);
    onPaymentSuccess(updated);
  }

  const paid = parseFloat(current.total) - parseFloat(current.balance);
  const patientName = `${current.patient.firstName} ${current.patient.lastName}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{patientName}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{current.description}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(current.createdAt).toLocaleDateString("es-CO")}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-sm font-semibold text-gray-900">{formatCOP(current.total)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Pagado</p>
              <p className="text-sm font-semibold text-green-700">{formatCOP(paid.toFixed(2))}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Saldo</p>
              <p className="text-sm font-semibold text-red-700">{formatCOP(current.balance)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Estado</p>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CLASSES[current.status] ?? ""}`}
              >
                {STATUS_LABELS[current.status] ?? current.status}
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Historial de pagos</p>
            {current.payments.length === 0 ? (
              <p className="text-sm text-gray-400">Sin pagos registrados.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-1">Fecha</th>
                    <th className="text-right py-1">Monto</th>
                    <th className="text-right py-1">Método</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {current.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-1.5 text-gray-600">
                        {new Date(p.createdAt).toLocaleDateString("es-CO")}
                      </td>
                      <td className="py-1.5 text-right">{formatCOP(p.amount)}</td>
                      <td className="py-1.5 text-right text-gray-500">
                        {PAYMENT_LABELS[p.method] ?? p.method}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {current.status !== "PAGADO" && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Registrar abono</p>
              <PaymentForm
                cajaRecordId={current.id}
                currentBalance={current.balance}
                onSuccess={handlePaymentSuccess}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
