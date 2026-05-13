import { verifySession } from "@/lib/dal";
import { proceduresService } from "@/lib/services/procedures.service";
import { ProceduresPageClient } from "@/components/admin/procedures-page-client";

export default async function ProceduresPage() {
  await verifySession();
  const procedures = await proceduresService.list();
  return <ProceduresPageClient initialProcedures={procedures} />;
}
