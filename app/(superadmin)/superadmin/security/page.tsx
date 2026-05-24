import { verifySuperAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { SecurityPageClient } from "@/components/security/security-page-client";

export default async function SuperAdminSecurityPage() {
  const session = await verifySuperAdmin();

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { totpEnabled: true },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Seguridad</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Opciones de seguridad de tu cuenta de plataforma.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Autenticación de dos factores (2FA)
        </h2>
        <SecurityPageClient totpEnabled={user?.totpEnabled ?? false} />
      </div>
    </div>
  );
}
