import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import { SecurityPageClient } from "@/components/security/security-page-client";

export default async function SecurityPage() {
  const session = await verifySession();
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { totpEnabled: true },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Seguridad</h1>
        <p className="text-sm text-gray-500 mt-1">Administra las opciones de seguridad de tu cuenta.</p>
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
