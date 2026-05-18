"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import {
  AppModule,
  MODULE_METADATA,
  MODULE_ORDER,
  DASHBOARD_METADATA,
} from "@/lib/module-metadata";

type Props = {
  userName: string;
  isAdmin: boolean;
  enabledModules: AppModule[];
  inventoryAlerts?: number;
};

export default function Sidebar({
  userName,
  isAdmin,
  enabledModules,
  inventoryAlerts = 0,
}: Props) {
  const pathname = usePathname();
  const enabledSet = new Set(enabledModules);

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
        <NavLink href={DASHBOARD_METADATA.href} label={DASHBOARD_METADATA.label} pathname={pathname}>
          <DASHBOARD_METADATA.icon size={16} className="flex-shrink-0" />
        </NavLink>

        {MODULE_ORDER.filter((mod) => enabledSet.has(mod)).map((mod) => {
          const meta = MODULE_METADATA[mod];
          const Icon = meta.icon;
          const showBadge = mod === AppModule.INVENTORY && inventoryAlerts > 0;
          return (
            <NavLink key={mod} href={meta.href} label={meta.label} pathname={pathname} badge={showBadge ? inventoryAlerts : undefined}>
              <Icon size={16} className="flex-shrink-0" />
            </NavLink>
          );
        })}

        {isAdmin && (
          <NavLink href="/admin" label="Administración" pathname={pathname}>
            <Settings size={16} className="flex-shrink-0" />
          </NavLink>
        )}
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

function NavLink({
  href,
  label,
  pathname,
  badge,
  children,
}: {
  href: string;
  label: string;
  pathname: string;
  badge?: number;
  children: React.ReactNode;
}) {
  const isActive =
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "bg-blue-50 text-blue-700"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      {children}
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}
