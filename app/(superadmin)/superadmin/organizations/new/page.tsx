import { verifySuperAdmin } from "@/lib/dal";
import { OrgForm } from "@/components/superadmin/org-form";

export default async function NewOrganizationPage() {
  await verifySuperAdmin();
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Nueva organización</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Crea una clínica y su usuario administrador. Los módulos activados son los que el admin verá.
        </p>
      </div>
      <OrgForm />
    </div>
  );
}
