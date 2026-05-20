import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subtitle?: string;
  accent?: "blue" | "amber" | "green" | "red";
  href?: string;
}

const ACCENT_STYLES: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-yellow-100 text-yellow-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-50 text-red-700",
};

export function KpiCard({
  icon: Icon,
  label,
  value,
  subtitle,
  accent = "blue",
  href,
}: KpiCardProps) {
  const content = (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-start justify-between">
        <span
          className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${ACCENT_STYLES[accent]}`}
        >
          <Icon size={18} />
        </span>
      </div>
      <div className="space-y-0.5 min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <p className="text-2xl font-semibold text-gray-900 leading-tight truncate">
          {value}
        </p>
        {subtitle && (
          <p className="text-sm text-gray-500 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );

  const baseClass =
    "block bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 h-full transition-all";

  if (href) {
    return (
      <Link
        href={href}
        className={`${baseClass} hover:border-blue-300 hover:shadow-sm`}
      >
        {content}
      </Link>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
