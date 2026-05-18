import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getAccessibleModules, assertModuleAccess, AppModule } from "@/lib/modules";
import { patientsService } from "@/lib/services/patients.service";
import { clinicalHistoryService } from "@/lib/services/clinical-history.service";
import { HabeaDataWarning } from "@/components/patients/habeas-data-warning";
import { PatientDetailClient } from "@/components/patients/patient-detail-client";
import { PatientPrivacyActions } from "@/components/patients/patient-privacy-actions";
import { NotFoundError } from "@/lib/errors";

interface PatientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const session = await verifySession();
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId);
  assertModuleAccess(accessible, AppModule.PATIENTS);

  const { id } = await params;

  let patient;
  let history;
  try {
    patient = await patientsService.get(id, session.organizationId);
    history = await clinicalHistoryService.getByPatientId(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div>
        <Link
          href="/patients"
          className="text-sm text-gray-500 hover:text-gray-700 font-medium"
        >
          ← Volver a Pacientes
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          {patient.firstName} {patient.lastName}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">CC {patient.idNumber}</p>
      </div>

      <HabeaDataWarning hasConsent={patient.habeaDataConsent} />

      <PatientDetailClient patient={patient} history={history} />

      <PatientPrivacyActions
        patientId={patient.id}
        patientName={`${patient.firstName} ${patient.lastName}`}
      />
    </div>
  );
}
