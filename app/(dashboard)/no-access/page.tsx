import { verifySession } from "@/lib/dal";
import { logout } from "@/app/actions/auth";

export default async function NoAccessPage() {
  await verifySession();

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <span className="text-3xl">🔒</span>
      </div>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">
        Sin módulos habilitados
      </h1>
      <p className="text-sm text-gray-500 max-w-sm mb-6">
        Tu cuenta no tiene acceso a ningún módulo. Contacta al administrador de tu clínica para que te asigne permisos.
      </p>
      <form action={logout}>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
