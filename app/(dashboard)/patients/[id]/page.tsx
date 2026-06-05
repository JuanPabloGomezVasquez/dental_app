import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getAccessibleModules, requireModuleAccess, AppModule } from "@/lib/modules";
import { patientsService } from "@/lib/services/patients.service";
import { clinicalHistoryService } from "@/lib/services/clinical-history.service";
import { HabeaDataWarning } from "@/components/patients/habeas-data-warning";
import { PatientDetailClient } from "@/components/patients/patient-detail-client";
import { NotFoundError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";

interface PatientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const session = await verifySession();
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId);
  requireModuleAccess(accessible, AppModule.PATIENTS);

  const { id } = await params;

  let patient;
  let history;
  try {
    [patient, history] = await Promise.all([
      patientsService.get(id, session.organizationId),
      clinicalHistoryService.getByPatientId(id),
    ]);
    writeAuditLog({
      userId: session.userId,
      userEmail: session.email,
      action: "PATIENT_VIEWED",
      resource: "Patient",
      resourceId: id,
      organizationId: session.organizationId,
    });
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

      <PatientDetailClient
        patient={patient}
        history={history}
        currentDoctorId={session.doctorId}
        currentRole={session.role}
      />

    </div>
  );
}
