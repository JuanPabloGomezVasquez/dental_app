import { verifySession } from "@/lib/dal";
import { getAccessibleModules, assertModuleAccess, AppModule } from "@/lib/modules";
import { patientsService } from "@/lib/services/patients.service";
import { PatientsPageClient } from "@/components/patients/patients-page-client";

interface PatientsPageProps {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const session = await verifySession();
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId);
  assertModuleAccess(accessible, AppModule.PATIENTS);

  const params = await searchParams;
  const search = params.search ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);
  const data = await patientsService.list({
    organizationId: session.organizationId,
    callerRole: session.role,
    callerDoctorId: session.doctorId,
    search,
    page,
  });
  return <PatientsPageClient data={data} search={search} />;
}
