"use client";

import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { Patient } from "@prisma/client";
import {
  createPatientSchema,
  updatePatientSchema,
  isMinor,
  type CreatePatientInput,
} from "@/lib/validations/patient.schema";
import { GuardianFields } from "@/components/patients/guardian-fields";

interface PatientFormProps {
  open: boolean;
  patient?: Patient | null;
  onSuccess: (patient: Patient) => void;
  onClose: () => void;
}

export function PatientForm({ open, patient, onSuccess, onClose }: PatientFormProps) {
  const isEditing = !!patient;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreatePatientInput>({
    resolver: zodResolver(
      isEditing ? updatePatientSchema : createPatientSchema
    ) as Resolver<CreatePatientInput>,
  });

  const birthDateValue = watch("birthDate");
  const showGuardianFields = isMinor(birthDateValue);

  useEffect(() => {
    if (!showGuardianFields) {
      setValue("guardianName", "");
      setValue("guardianRelation", "");
      setValue("guardianPhone", "");
    }
  }, [showGuardianFields, setValue]);

  useEffect(() => {
    if (!open) return;
    if (patient) {
      const birthDateStr = patient.birthDate
        ? String(patient.birthDate).split("T")[0]
        : "";
      reset({
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone,
        email: patient.email ?? "",
        birthDate: birthDateStr,
        address: patient.address ?? "",
        guardianName: patient.guardianName ?? "",
        guardianRelation: patient.guardianRelation ?? "",
        guardianPhone: patient.guardianPhone ?? "",
      });
    } else {
      reset({
        firstName: "", lastName: "", idNumber: "", phone: "",
        email: "", birthDate: "", address: "",
        guardianName: "", guardianRelation: "", guardianPhone: "",
        habeaDataConsent: false,
      });
    }
  }, [open, patient, reset]);

  async function onSubmit(data: CreatePatientInput) {
    const url = isEditing ? `/api/patients/${patient.id}` : "/api/patients";
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

    toast.success(isEditing ? "Datos actualizados" : "Paciente creado");
    onSuccess(json as Patient);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isEditing ? "Editar Paciente" : "Nuevo Paciente"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="overflow-y-auto p-6 space-y-4 flex-1"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span aria-hidden="true">*</span>
              </label>
              <input id="firstName" type="text" {...register("firstName")}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.firstName && <p role="alert" className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Apellidos <span aria-hidden="true">*</span>
              </label>
              <input id="lastName" type="text" {...register("lastName")}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.lastName && <p role="alert" className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="idNumber" className="block text-sm font-medium text-gray-700 mb-1">
              N° Identificación <span aria-hidden="true">{!isEditing && "*"}</span>
            </label>
            {isEditing ? (
              <p className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                {patient.idNumber}
              </p>
            ) : (
              <>
                <input id="idNumber" type="text" {...register("idNumber")}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors.idNumber && <p role="alert" className="mt-1 text-xs text-red-600">{errors.idNumber.message}</p>}
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono <span aria-hidden="true">*</span>
              </label>
              <input id="phone" type="tel" {...register("phone")} placeholder="3001234567"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.phone && <p role="alert" className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
            </div>
            <div>
              <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de nacimiento
              </label>
              <input id="birthDate" type="date" {...register("birthDate")}
                max={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.birthDate && <p role="alert" className="mt-1 text-xs text-red-600">{errors.birthDate.message}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input id="email" type="email" {...register("email")}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {errors.email && <p role="alert" className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input id="address" type="text" {...register("address")}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {showGuardianFields && (
            <GuardianFields register={register} errors={errors} />
          )}

          {!isEditing && (
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("habeaDataConsent")}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  El paciente ha firmado el consentimiento de Habeas Data (Ley 1581/2012) <span aria-hidden="true" className="text-red-500">*</span>
                </span>
              </label>
              {errors.habeaDataConsent && (
                <p role="alert" className="mt-1 text-xs text-red-600">{errors.habeaDataConsent.message}</p>
              )}
            </div>
          )}

          {errors.root && (
            <p role="alert" className="text-xs text-red-600">{errors.root.message}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
