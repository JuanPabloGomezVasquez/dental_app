import { verifySession, assertAdmin } from "@/lib/dal";
import { orgModulesService } from "@/lib/services/org-modules.service";
import { handleApiError } from "@/lib/errors";

export async function GET(): Promise<Response> {
  const session = await verifySession();
  assertAdmin(session.role);

  try {
    const modules = await orgModulesService.getOrgModules(session.organizationId);
    return Response.json(modules);
  } catch (error) {
    return handleApiError(error);
  }
}

// Module configuration is managed exclusively by the platform super admin.
export async function PUT(): Promise<Response> {
  return Response.json(
    { error: "La configuración de módulos es gestionada por el administrador de la plataforma." },
    { status: 403 }
  );
}
