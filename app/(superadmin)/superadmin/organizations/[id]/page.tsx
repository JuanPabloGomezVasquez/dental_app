import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySuperAdmin } from "@/lib/dal";
import { superadminService } from "@/lib/services/superadmin.service";
import { OrgDetailClient } from "@/components/superadmin/org-detail-client";
import { ChevronLeft } from "lucide-react";

export default async function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await verifySuperAdmin();
  const { id } = await params;

  let org;
  try {
    org = await superadminService.getOrgDetail(id);
  } catch {
    notFound();
  }

  return (
    <div>
      <Link
        href="/superadmin/organizations"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ChevronLeft size={14} />
        Todas las organizaciones
      </Link>
      <OrgDetailClient org={org} />
    </div>
  );
}
