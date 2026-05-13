"use client";

import type { UseFormRegister, FieldErrors } from "react-hook-form";
import type { CreatePatientInput } from "@/lib/validations/patient.schema";

interface GuardianFieldsProps {
  register: UseFormRegister<CreatePatientInput>;
  errors: FieldErrors<CreatePatientInput>;
}

export function GuardianFields({ register, errors }: GuardianFieldsProps) {
  return (
    <fieldset className="border border-yellow-200 rounded-lg p-4 space-y-3 bg-yellow-50">
      <legend className="text-sm font-medium text-yellow-800 px-1">
        Datos del acudiente (paciente menor de edad)
      </legend>

      <div>
        <label htmlFor="guardianName" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre del acudiente
        </label>
        <input
          id="guardianName"
          type="text"
          {...register("guardianName")}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.guardianName && (
          <p role="alert" className="mt-1 text-xs text-red-600">{errors.guardianName.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="guardianRelation" className="block text-sm font-medium text-gray-700 mb-1">
          Relación con el paciente
        </label>
        <input
          id="guardianRelation"
          type="text"
          placeholder="Ej: Madre, Padre, Tutor"
          {...register("guardianRelation")}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="guardianPhone" className="block text-sm font-medium text-gray-700 mb-1">
          Teléfono del acudiente
        </label>
        <input
          id="guardianPhone"
          type="tel"
          {...register("guardianPhone")}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </fieldset>
  );
}
