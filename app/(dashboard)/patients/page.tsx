import { verifySession } from "@/lib/dal";
import { patientsService } from "@/lib/services/patients.service";
import { PatientsPageClient } from "@/components/patients/patients-page-client";

interface PatientsPageProps {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  await verifySession();
  const params = await searchParams;
  const search = params.search ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);
  const data = await patientsService.list({ search, page });
  return <PatientsPageClient data={data} search={search} />;
}
