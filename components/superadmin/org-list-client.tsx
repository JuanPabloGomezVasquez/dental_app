"use client";
import Link from "next/link";
import { AppModule } from "@prisma/client";
import { MODULE_METADATA } from "@/lib/module-metadata";
import { Building2, Users, Stethoscope, UserSquare2, ChevronRight } from "lucide-react";

type OrgSummary = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: Date;
  userCount: number;
  doctorCount: number;
  patientCount: number;
  enabledModules: AppModule[];
};

export function OrgListClient({ organizations }: { organizations: OrgSummary[] }) {
  if (organizations.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <Building2 size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">No hay organizaciones registradas aún.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      {organizations.map((org) => (
        <Link
          key={org.id}
          href={`/superadmin/organizations/${org.id}`}
          className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-purple-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-medium text-gray-900 truncate">{org.name}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  org.active
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {org.active ? "Activa" : "Suspendida"}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Users size={11} />
                {org.userCount} {org.userCount === 1 ? "usuario" : "usuarios"}
              </span>
              <span className="flex items-center gap-1">
                <Stethoscope size={11} />
                {org.doctorCount} {org.doctorCount === 1 ? "doctor" : "doctores"}
              </span>
              <span className="flex items-center gap-1">
                <UserSquare2 size={11} />
                {org.patientCount} {org.patientCount === 1 ? "paciente" : "pacientes"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {org.enabledModules.length === 0 ? (
              <span className="text-xs text-gray-400">Sin módulos</span>
            ) : (
              org.enabledModules.map((mod) => (
                <span
                  key={mod}
                  className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium"
                >
                  {MODULE_METADATA[mod].label}
                </span>
              ))
            )}
          </div>

          <ChevronRight size={16} className="text-gray-400 flex-shrink-0 group-hover:text-gray-600 transition-colors" />
        </Link>
      ))}
    </div>
  );
}
