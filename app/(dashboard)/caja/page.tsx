import { verifySession } from "@/lib/dal";
import { getAccessibleModules, assertModuleAccess, AppModule } from "@/lib/modules";
import { cajaService } from "@/lib/services/caja.service";
import { CajaPageClient } from "@/components/caja/caja-page-client";

interface CajaPageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export default async function CajaPage({ searchParams }: CajaPageProps) {
  const session = await verifySession();
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId);
  assertModuleAccess(accessible, AppModule.CAJA);

  const { search = "", status = "", page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);

  const data = await cajaService.list({
    organizationId: session.organizationId,
    search: search || undefined,
    status: status || undefined,
    page,
  });
  return <CajaPageClient data={data} search={search} status={status} />;
}
