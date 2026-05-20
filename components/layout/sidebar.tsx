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
    <aside
      className="w-16 md:w-60 h-full flex flex-col flex-shrink-0"
      style={{
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Logo */}
      <div
        className="px-3 md:px-5 py-4 flex items-center gap-3"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/20">
          <span className="text-white font-bold text-sm">D</span>
        </div>
        <div className="hidden md:block min-w-0">
          <p className="text-sm font-semibold text-white truncate">DentApp</p>
          <p
            className="text-xs truncate"
            style={{ color: "var(--sidebar-text)" }}
          >
            {userName}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <NavLink
          href={DASHBOARD_METADATA.href}
          label={DASHBOARD_METADATA.label}
          pathname={pathname}
        >
          <DASHBOARD_METADATA.icon size={18} className="flex-shrink-0" />
        </NavLink>

        {MODULE_ORDER.filter((mod) => enabledSet.has(mod)).map((mod) => {
          const meta = MODULE_METADATA[mod];
          const Icon = meta.icon;
          const showBadge = mod === AppModule.INVENTORY && inventoryAlerts > 0;
          return (
            <NavLink
              key={mod}
              href={meta.href}
              label={meta.label}
              pathname={pathname}
              badge={showBadge ? inventoryAlerts : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
            </NavLink>
          );
        })}

        {isAdmin && (
          <NavLink href="/admin" label="Administración" pathname={pathname}>
            <Settings size={18} className="flex-shrink-0" />
          </NavLink>
        )}
      </nav>

      {/* Logout */}
      <div
        className="px-2 py-3"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        <form action={logout}>
          <button
            type="submit"
            title="Cerrar sesión"
            className="sidebar-link flex items-center justify-center md:justify-start gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium"
          >
            <LogOut size={16} />
            <span className="hidden md:block">Cerrar sesión</span>
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
      title={label}
      data-active={isActive}
      className="sidebar-link flex items-center justify-center md:justify-start gap-3 px-3 py-2 rounded-xl text-sm font-medium"
    >
      {children}
      <span className="hidden md:block flex-1">{label}</span>
      {badge !== undefined && (
        <span className="hidden md:inline-flex items-center justify-center w-5 h-5 text-xs font-semibold rounded-full bg-orange-400/20 text-orange-300">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}
