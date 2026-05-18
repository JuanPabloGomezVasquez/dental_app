import { verifySession } from "@/lib/dal";
import { getAccessibleModules, AppModule } from "@/lib/modules";
import { MODULE_METADATA, MODULE_ORDER } from "@/lib/module-metadata";
import Link from "next/link";

const MODULE_EMOJI: Record<AppModule, string> = {
  [AppModule.APPOINTMENTS]: "📅",
  [AppModule.PATIENTS]: "👥",
  [AppModule.INVENTORY]: "📦",
  [AppModule.CAJA]: "💵",
  [AppModule.AI_ASSISTANT]: "🤖",
};

type Tile = { label: string; href: string; emoji: string };

export default async function DashboardPage() {
  const session = await verifySession();
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId);

  const tiles: Tile[] = MODULE_ORDER
    .filter((mod) => accessible.has(mod))
    .map((mod) => ({
      label: MODULE_METADATA[mod].label,
      href: MODULE_METADATA[mod].href,
      emoji: MODULE_EMOJI[mod],
    }));

  if (session.role === "ADMIN") {
    tiles.push({ label: "Administración", href: "/admin", emoji: "⚙️" });
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Bienvenido, {session.name}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Selecciona un módulo desde el menú lateral para comenzar.
        </p>
      </div>

      {tiles.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl">
          {tiles.map(({ label, href, emoji }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all text-center"
            >
              <span className="text-3xl">{emoji}</span>
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          No tienes módulos habilitados. Contacta al administrador.
        </p>
      )}
    </div>
  );
}
