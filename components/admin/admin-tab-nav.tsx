"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/doctors", label: "Doctores" },
  { href: "/admin/procedures", label: "Procedimientos" },
  { href: "/admin/rips", label: "RIPS" },
];

export function AdminTabNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-gray-200 px-6">
      {tabs.map(({ href, label }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
