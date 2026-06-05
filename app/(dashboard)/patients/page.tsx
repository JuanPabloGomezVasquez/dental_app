import { verifySession } from "@/lib/dal";
import { getAccessibleModules, requireModuleAccess, AppModule } from "@/lib/modules";
import { patientsService } from "@/lib/services/patients.service";
import { PatientsPageClient } from "@/components/patients/patients-page-client";

interface PatientsPageProps {
  searchParams: Promise<{ search?: string; page?: string; new?: string }>;
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const session = await verifySession();
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId);
  requireModuleAccess(accessible, AppModule.PATIENTS);

  const params = await searchParams;
  const search = params.search ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);
  const data = await patientsService.list({
    organizationId: session.organizationId,
    search,
    page,
  });
  return <PatientsPageClient data={data} search={search} openNew={params.new === "1"} />;
}

