"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Doctor } from "@prisma/client";
import { DoctorTable } from "@/components/admin/doctor-table";
import { DoctorForm } from "@/components/admin/doctor-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface DoctorsPageClientProps {
  initialDoctors: Doctor[];
}

export function DoctorsPageClient({ initialDoctors }: DoctorsPageClientProps) {
  const [doctors, setDoctors] = useState<Doctor[]>(initialDoctors);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [doctorToToggle, setDoctorToToggle] = useState<Doctor | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  function handleEdit(doctor: Doctor) {
    setSelectedDoctor(doctor);
    setIsFormOpen(true);
  }

  function handleNewDoctor() {
    setSelectedDoctor(null);
    setIsFormOpen(true);
  }

  function handleFormSuccess(saved: Doctor) {
    setDoctors((prev) =>
      prev.some((d) => d.id === saved.id)
        ? prev.map((d) => (d.id === saved.id ? saved : d))
        : [...prev, saved]
    );
  }

  function handleToggleActive(doctor: Doctor) {
    setDoctorToToggle(doctor);
    setIsConfirmOpen(true);
  }

  async function handleConfirmToggle() {
    if (!doctorToToggle) return;
    const newActive = !doctorToToggle.active;

    const res = await fetch(`/api/admin/doctors/${doctorToToggle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: newActive }),
    });

    const json: unknown = await res.json();

    if (!res.ok) {
      const message =
        typeof json === "object" && json !== null && "error" in json
          ? String((json as Record<string, unknown>).error)
          : "Error al actualizar";
      toast.error(message);
    } else {
      setDoctors((prev) =>
        prev.map((d) => (d.id === doctorToToggle.id ? (json as Doctor) : d))
      );
      toast.success(newActive ? "Doctor activado" : "Doctor desactivado");
    }

    setIsConfirmOpen(false);
    setDoctorToToggle(null);
  }

  const isDeactivating = doctorToToggle ? doctorToToggle.active : false;

  return (
    <>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Doctores</h1>
            <p className="text-sm text-gray-500 mt-0.5">{doctors.length} registrados</p>
          </div>
          <button
            type="button"
            onClick={handleNewDoctor}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Nuevo Doctor
          </button>
        </div>

        <DoctorTable
          doctors={doctors}
          onEdit={handleEdit}
          onToggleActive={handleToggleActive}
        />
      </div>

      <DoctorForm
        open={isFormOpen}
        doctor={selectedDoctor}
        onSuccess={handleFormSuccess}
        onClose={() => setIsFormOpen(false)}
      />

      <ConfirmDialog
        open={isConfirmOpen}
        title={isDeactivating ? "Desactivar doctor" : "Activar doctor"}
        description={
          isDeactivating
            ? `¿Desactivar a ${doctorToToggle?.name ?? "este doctor"}? No aparecerá disponible para nuevas citas.`
            : `¿Activar a ${doctorToToggle?.name ?? "este doctor"}?`
        }
        confirmLabel={isDeactivating ? "Desactivar" : "Activar"}
        destructive={isDeactivating}
        onConfirm={handleConfirmToggle}
        onCancel={() => {
          setIsConfirmOpen(false);
          setDoctorToToggle(null);
        }}
      />
    </>
  );
}
