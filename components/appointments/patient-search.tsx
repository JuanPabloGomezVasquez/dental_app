"use client"

import { useState, useEffect, useRef } from "react"
import { X } from "lucide-react"

interface PatientResult {
  id: string
  firstName: string
  lastName: string
  idNumber: string
}

interface PatientSearchProps {
  selectedPatientId: string | null
  onSelect: (patient: PatientResult) => void
  onClear: () => void
  onNewPatient: () => void
}

export function PatientSearch({
  selectedPatientId,
  onSelect,
  onClear,
  onNewPatient,
}: PatientSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PatientResult[]>([])
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync clear from parent (e.g. form reset)
  useEffect(() => {
    if (selectedPatientId === null) {
      setSelectedPatient(null)
      setQuery("")
    }
  }, [selectedPatientId])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      setIsLoading(true)
      fetch(`/api/patients?search=${encodeURIComponent(query)}&pageSize=10`)
        .then((res) => res.json())
        .then((data) => {
          const json = data as { patients: PatientResult[] }
          setResults(json.patients ?? [])
          setIsOpen(true)
        })
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false))
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  function handleSelect(patient: PatientResult) {
    setSelectedPatient(patient)
    setQuery("")
    setResults([])
    setIsOpen(false)
    onSelect(patient)
  }

  function handleClear() {
    setSelectedPatient(null)
    setQuery("")
    setResults([])
    setIsOpen(false)
    onClear()
  }

  if (selectedPatient) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
        <span className="text-sm text-gray-900 flex-1">
          {selectedPatient.lastName}, {selectedPatient.firstName} — {selectedPatient.idNumber}
        </span>
        <button
          type="button"
          onClick={handleClear}
          aria-label="Limpiar selección de paciente"
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o cédula..."
          aria-label="Buscar paciente"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {isLoading && (
          <span className="absolute right-3 top-2.5 text-xs text-gray-400">Buscando...</span>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.length > 0 ? (
            results.map((patient) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => handleSelect(patient)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
              >
                {patient.lastName}, {patient.firstName} — {patient.idNumber}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-gray-500">No se encontraron pacientes</p>
          )}
          <button
            type="button"
            onClick={onNewPatient}
            className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-100"
          >
            + Nuevo Paciente
          </button>
        </div>
      )}

      {!isOpen && (
        <button
          type="button"
          onClick={onNewPatient}
          className="mt-1 text-xs text-blue-600 hover:underline"
        >
          + Nuevo Paciente
        </button>
      )}
    </div>
  )
}
