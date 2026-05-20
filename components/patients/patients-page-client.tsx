"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Patient } from "@prisma/client";
import type { PatientPage } from "@/lib/services/patients.service";
import { PatientTable } from "@/components/patients/patient-table";
import { PatientForm } from "@/components/patients/patient-form";

interface PatientsPageClientProps {
  data: PatientPage;
  search: string;
}

export function PatientsPageClient({ data, search }: PatientsPageClientProps) {
  const router = useRouter();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  function handleSearch(value: string) {
    const params = new URLSearchParams();
    if (value) params.set("search", value);
    params.set("page", "1");
    router.replace(`/patients?${params.toString()}`);
  }

  function handlePageChange(page: number) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    router.replace(`/patients?${params.toString()}`);
  }

  function handleEdit(patient: Patient) {
    setSelectedPatient(patient);
    setIsFormOpen(true);
  }

  function handleNewPatient() {
    setSelectedPatient(null);
    setIsFormOpen(true);
  }

  function handleViewHistory(patient: Patient) {
    router.push(`/patients/${patient.id}`);
  }

  function handleFormSuccess() {
    router.refresh();
  }

  return (
    <>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Pacientes</h1>
            <p className="text-sm text-gray-500 mt-0.5">{data.total} registrados</p>
          </div>
          <button
            type="button"
            onClick={handleNewPatient}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Nuevo Paciente
          </button>
        </div>

        <PatientTable
          patients={data.patients}
          total={data.total}
          page={data.page}
          pages={data.pages}
          search={search}
          onSearch={handleSearch}
          onPageChange={handlePageChange}
          onEdit={handleEdit}
          onViewHistory={handleViewHistory}
        />
      </div>

      <PatientForm
        open={isFormOpen}
        patient={selectedPatient}
        onSuccess={handleFormSuccess}
        onClose={() => setIsFormOpen(false)}
      />
    </>
  );
}
