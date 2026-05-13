import { verifySession } from "@/lib/dal";

export default async function DashboardPage() {
  const session = await verifySession();

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

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl">
        {[
          { label: "Agendamiento", href: "/appointments", emoji: "📅" },
          { label: "Pacientes", href: "/patients", emoji: "👥" },
          { label: "Inventario", href: "/inventory", emoji: "📦" },
          { label: "Caja", href: "/caja", emoji: "💵" },
          { label: "Administración", href: "/admin", emoji: "⚙️" },
          { label: "Asistente IA", href: "/ai-assistant", emoji: "🤖" },
        ].map(({ label, href, emoji }) => (
          <a
            key={href}
            href={href}
            className="flex flex-col items-center gap-2 p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all text-center"
          >
            <span className="text-3xl">{emoji}</span>
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
