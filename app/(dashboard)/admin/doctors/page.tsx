import { verifySession } from "@/lib/dal";
import { doctorsService } from "@/lib/services/doctors.service";
import { DoctorsPageClient } from "@/components/admin/doctors-page-client";

export default async function DoctorsPage() {
  await verifySession();
  const doctors = await doctorsService.list();
  return <DoctorsPageClient initialDoctors={doctors} />;
}
