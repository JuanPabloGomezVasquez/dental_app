import { verifySession } from "@/lib/dal";
import { cajaService } from "@/lib/services/caja.service";
import { CajaPageClient } from "@/components/caja/caja-page-client";

interface CajaPageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export default async function CajaPage({ searchParams }: CajaPageProps) {
  await verifySession();
  const { search = "", status = "", page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);

  const data = await cajaService.list({ search: search || undefined, status: status || undefined, page });
  return <CajaPageClient data={data} search={search} status={status} />;
}
