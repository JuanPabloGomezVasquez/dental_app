"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/superadmin/organizations", label: "Organizaciones" },
  { href: "/superadmin/audit-logs", label: "Logs de auditoría" },
  { href: "/superadmin/security", label: "Seguridad" },
];

export function SuperAdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            pathname.startsWith(href)
              ? "bg-purple-100 text-purple-800"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
