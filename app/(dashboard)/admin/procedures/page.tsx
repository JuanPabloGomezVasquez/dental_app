import { verifySession } from "@/lib/dal";
import { assertAdmin } from "@/lib/dal";
import { proceduresService } from "@/lib/services/procedures.service";
import { ProceduresPageClient } from "@/components/admin/procedures-page-client";

export default async function ProceduresPage() {
  const session = await verifySession();
  assertAdmin(session.role);
  const procedures = await proceduresService.list({ organizationId: session.organizationId });
  return <ProceduresPageClient initialProcedures={procedures} />;
}
