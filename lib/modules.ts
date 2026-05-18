import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/errors";

export { AppModule } from "@/lib/module-metadata";
export type { ModuleMetadata } from "@/lib/module-metadata";
export {
  MODULE_METADATA,
  MODULE_ORDER,
  DASHBOARD_METADATA,
} from "@/lib/module-metadata";

import { AppModule } from "@/lib/module-metadata";

export const getAccessibleModules = cache(
  async (
    organizationId: string,
    role: "ADMIN" | "DOCTOR",
    doctorId: string | null
  ): Promise<Set<AppModule>> => {
    if (role === "ADMIN") {
      const orgModules = await db.orgModule.findMany({
        where: { organizationId, enabled: true },
      });
      return new Set(orgModules.map((m) => m.module));
    }

    if (!doctorId) return new Set();

    const [orgModules, doctorPerms] = await Promise.all([
      db.orgModule.findMany({ where: { organizationId, enabled: true } }),
      db.doctorModulePermission.findMany({ where: { doctorId, enabled: true } }),
    ]);

    const orgEnabled = new Set(orgModules.map((m) => m.module));
    const doctorEnabled = new Set(doctorPerms.map((p) => p.module));

    const result = new Set<AppModule>();
    for (const mod of doctorEnabled) {
      if (orgEnabled.has(mod)) result.add(mod);
    }
    return result;
  }
);

export function assertModuleAccess(
  accessible: Set<AppModule>,
  module: AppModule
): void {
  if (!accessible.has(module)) {
    throw new ForbiddenError("No tienes acceso a este módulo");
  }
}
