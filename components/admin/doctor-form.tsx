"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import type { Doctor } from "@prisma/client";
import {
  createDoctorSchema,
  updateDoctorSchema,
  enableLoginSchema,
  DENTAL_SPECIALTIES,
  type CreateDoctorInput,
  type EnableLoginInput,
} from "@/lib/validations/doctor.schema";

interface DoctorFormProps {
  open: boolean;
  doctor?: Doctor | null;
  onSuccess: (doctor: Doctor) => void;
  onClose: () => void;
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span aria-hidden="true">*</span>}
      </label>
      {children}
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const INPUT_CLS = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

export function DoctorForm({ open, doctor, onSuccess, onClose }: DoctorFormProps) {
  const isEditing = !!doctor;
  const hasLogin = isEditing && doctor.userId !== null;
  const [loginSectionOpen, setLoginSectionOpen] = useState(false);
  const [loginPending, startLoginTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateDoctorInput>({
    resolver: zodResolver(
      (isEditing ? updateDoctorSchema : createDoctorSchema) as typeof createDoctorSchema
    ),
  });

  const loginForm = useForm<EnableLoginInput>({
    resolver: zodResolver(enableLoginSchema),
  });

  useEffect(() => {
    if (open) {
      reset(
        doctor
          ? {
              name: doctor.name,
              specialty: (doctor.specialty as CreateDoctorInput["specialty"]) ?? undefined,
              phone: doctor.phone ?? "",
              email: doctor.email ?? "",
              idDocument: doctor.idDocument ?? "",
              professionalCard: doctor.professionalCard ?? "",
              rethus: doctor.rethus ?? "",
            }
          : { name: "", specialty: undefined, phone: "", email: "", idDocument: "", professionalCard: "", rethus: "" }
      );
      setLoginSectionOpen(false);
      loginForm.reset({ email: "", initialPassword: "" });
    }
  }, [open, doctor, reset, loginForm]);

  async function onSubmit(data: CreateDoctorInput) {
    const url = isEditing ? `/api/admin/doctors/${doctor.id}` : "/api/admin/doctors";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json: unknown = await res.json();

    if (!res.ok) {
      const message =
        typeof json === "object" && json !== null && "error" in json
          ? String((json as Record<string, unknown>).error)
          : "Error al guardar";
      setError("root", { message });
      toast.error(message);
      return;
    }

    toast.success(isEditing ? "Doctor actualizado" : "Doctor creado");
    onSuccess(json as Doctor);
    onClose();
  }

  function enableLogin(data: EnableLoginInput) {
    startLoginTransition(async () => {
      const res = await fetch(`/api/admin/doctors/${doctor!.id}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json: unknown = await res.json();
        const message =
          typeof json === "object" && json !== null && "error" in json
            ? String((json as Record<string, unknown>).error)
            : "Error al habilitar acceso";
        loginForm.setError("root", { message });
        toast.error(message);
        return;
      }

      toast.success("Acceso habilitado");
      setLoginSectionOpen(false);
      onSuccess({ ...doctor!, userId: "enabled" } as Doctor);
    });
  }

  function disableLogin() {
    startLoginTransition(async () => {
      const res = await fetch(`/api/admin/doctors/${doctor!.id}/login`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Error al deshabilitar acceso");
        return;
      }
      toast.success("Acceso deshabilitado");
      onSuccess({ ...doctor!, userId: null } as Doctor);
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isEditing ? "Editar Doctor" : "Nuevo Doctor"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-6 space-y-4">
          {/* Nombre */}
          <Field label="Nombre" required error={errors.name?.message}>
            <input id="name" type="text" {...register("name")} className={INPUT_CLS} />
          </Field>

          {/* Especialidad dropdown */}
          <Field label="Especialidad" error={errors.specialty?.message}>
            <select {...register("specialty")} className={INPUT_CLS}>
              <option value="">Sin especialidad</option>
              {DENTAL_SPECIALTIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>

          {/* Documento de identificación + Tarjeta profesional */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="N° Identificación" error={errors.idDocument?.message}>
              <input
                type="text"
                {...register("idDocument")}
                placeholder="CC / CE / Pasaporte"
                className={INPUT_CLS}
              />
            </Field>
            <Field label="Tarjeta profesional" error={errors.professionalCard?.message}>
              <input
                type="text"
                {...register("professionalCard")}
                placeholder="Ej: 12345-A"
                className={INPUT_CLS}
              />
            </Field>
          </div>

          {/* ReTHUS */}
          <Field label="Código ReTHUS (si aplica)" error={errors.rethus?.message}>
            <input
              type="text"
              {...register("rethus")}
              placeholder="Código del Registro de Talento Humano en Salud"
              className={INPUT_CLS}
            />
          </Field>

          {/* Teléfono */}
          <Field label="Teléfono" error={errors.phone?.message}>
            <input
              type="tel"
              {...register("phone")}
              placeholder="3001234567"
              className={INPUT_CLS}
            />
          </Field>

          {/* Email */}
          <Field
            label="Correo electrónico"
            required={!isEditing}
            error={errors.email?.message}
          >
            <input
              type="email"
              {...register("email")}
              disabled={isEditing}
              className={`${INPUT_CLS} disabled:bg-gray-50 disabled:text-gray-500`}
            />
            {!isEditing && (
              <p className="mt-1 text-xs text-gray-400">Se enviará la contraseña temporal a este correo.</p>
            )}
          </Field>

          {errors.root && (
            <p role="alert" className="text-xs text-red-600">{errors.root.message}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>

        {isEditing && (
          <div className="px-6 pb-6 pt-0">
            <div className="border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={() => setLoginSectionOpen((v) => !v)}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-700"
              >
                <span>Acceso al sistema</span>
                {loginSectionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {loginSectionOpen && (
                <div className="mt-3 space-y-3">
                  {hasLogin ? (
                    <>
                      <p className="text-xs text-green-700 bg-green-50 rounded px-3 py-2">
                        Este doctor tiene acceso habilitado al sistema.
                      </p>
                      <button
                        type="button"
                        disabled={loginPending}
                        onClick={disableLogin}
                        className="px-3 py-2 text-sm font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
                      >
                        {loginPending ? "Procesando..." : "Deshabilitar acceso"}
                      </button>
                    </>
                  ) : (
                    <form onSubmit={loginForm.handleSubmit(enableLogin)} noValidate className="space-y-3">
                      <p className="text-xs text-gray-500">
                        Crea credenciales para que el doctor inicie sesión.
                      </p>
                      <div>
                        <label htmlFor="loginEmail" className="block text-sm font-medium text-gray-700 mb-1">
                          Email de acceso <span aria-hidden="true">*</span>
                        </label>
                        <input id="loginEmail" type="email" {...loginForm.register("email")} className={INPUT_CLS} />
                        {loginForm.formState.errors.email && (
                          <p role="alert" className="mt-1 text-xs text-red-600">
                            {loginForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="initialPassword" className="block text-sm font-medium text-gray-700 mb-1">
                          Contraseña inicial <span aria-hidden="true">*</span>
                        </label>
                        <input id="initialPassword" type="password" {...loginForm.register("initialPassword")} className={INPUT_CLS} />
                        {loginForm.formState.errors.initialPassword && (
                          <p role="alert" className="mt-1 text-xs text-red-600">
                            {loginForm.formState.errors.initialPassword.message}
                          </p>
                        )}
                      </div>
                      {loginForm.formState.errors.root && (
                        <p role="alert" className="text-xs text-red-600">
                          {loginForm.formState.errors.root.message}
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={loginPending}
                        className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loginPending ? "Habilitando..." : "Habilitar acceso"}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
