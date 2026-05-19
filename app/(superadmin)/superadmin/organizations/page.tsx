import Link from "next/link";
import { superadminService } from "@/lib/services/superadmin.service";
import { verifySuperAdmin } from "@/lib/dal";
import { OrgListClient } from "@/components/superadmin/org-list-client";
import { Plus } from "lucide-react";

export default async function SuperAdminOrgsPage() {
  await verifySuperAdmin();
  const organizations = await superadminService.listOrganizations();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Organizaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {organizations.length} {organizations.length === 1 ? "clínica registrada" : "clínicas registradas"}
          </p>
        </div>
        <Link
          href="/superadmin/organizations/new"
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={16} />
          Nueva organización
        </Link>
      </div>
      <OrgListClient organizations={organizations} />
    </div>
  );
}
