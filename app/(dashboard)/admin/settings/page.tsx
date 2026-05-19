import { verifySession, assertAdmin } from "@/lib/dal";
import { orgModulesService } from "@/lib/services/org-modules.service";
import { OrgModuleSettings } from "@/components/admin/org-module-settings";

export default async function SettingsPage() {
  const session = await verifySession();
  assertAdmin(session.role);

  const modules = await orgModulesService.getOrgModules(session.organizationId);

  return (
    <div className="p-6 space-y-4 max-w-xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Módulos contratados</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Estos son los módulos habilitados para tu clínica. Para cambios, contacta al administrador de la plataforma.
        </p>
      </div>
      <OrgModuleSettings modules={modules} />
    </div>
  );
}
