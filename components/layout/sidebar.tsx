"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Package,
  DollarSign,
  Settings,
  Bot,
  LogOut,
} from "lucide-react";
import { logout } from "@/app/actions/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/appointments", label: "Agendamiento", icon: CalendarDays },
  { href: "/patients", label: "Pacientes", icon: Users },
  {
    href: "/inventory",
    label: "Inventario",
    icon: Package,
    hasBadge: true,
  },
  { href: "/caja", label: "Caja", icon: DollarSign },
  { href: "/admin", label: "Administración", icon: Settings },
  { href: "/ai-assistant", label: "Asistente IA", icon: Bot },
];

type Props = {
  userName: string;
  inventoryAlerts?: number;
};

export default function Sidebar({ userName, inventoryAlerts = 0 }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              DentApp
            </p>
            <p className="text-xs text-gray-500 truncate">{userName}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, hasBadge }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {hasBadge && inventoryAlerts > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                  {inventoryAlerts > 9 ? "9+" : inventoryAlerts}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <LogOut size={16} />
            <span>Cerrar sesión</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
