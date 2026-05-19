import { Toaster } from "sonner";
import { verifySuperAdmin } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { ShieldCheck, LogOut } from "lucide-react";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySuperAdmin();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">DentApp</span>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
              Super Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{session.name}</span>
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                <LogOut size={14} />
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
