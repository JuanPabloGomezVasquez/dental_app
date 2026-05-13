"use client"

import { useState, useEffect } from "react"

interface DoctorFilterProps {
  selectedDoctorId: string | null
  onChange: (doctorId: string | null) => void
}

type DoctorOption = { id: string; name: string }

export function DoctorFilter({ selectedDoctorId, onChange }: DoctorFilterProps) {
  const [doctors, setDoctors] = useState<DoctorOption[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/doctors/active")
      .then((res) => res.json())
      .then((data) => setDoctors(data as DoctorOption[]))
      .catch(() => setDoctors([]))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <select
      value={selectedDoctorId ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={isLoading}
      aria-label="Filtrar por doctor"
      className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      <option value="">{isLoading ? "Cargando..." : "Todos los doctores"}</option>
      {doctors.map((d) => (
        <option key={d.id} value={d.id}>{d.name}</option>
      ))}
    </select>
  )
}
