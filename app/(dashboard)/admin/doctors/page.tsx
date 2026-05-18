import { verifySession } from "@/lib/dal";
import { assertAdmin } from "@/lib/dal";
import { doctorsService } from "@/lib/services/doctors.service";
import { DoctorsPageClient } from "@/components/admin/doctors-page-client";

export default async function DoctorsPage() {
  const session = await verifySession();
  assertAdmin(session.role);
  const doctors = await doctorsService.list({ organizationId: session.organizationId });
  return <DoctorsPageClient initialDoctors={doctors} />;
}
