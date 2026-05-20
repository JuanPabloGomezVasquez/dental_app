import Link from "next/link";
import {
  AlertTriangle,
  DollarSign,
  ChevronRight,
  Plus,
  UserPlus,
  CalendarPlus,
  type LucideIcon,
} from "lucide-react";

interface LowStockItem {
  id: string;
  commercialName: string;
  quantity: number;
  minStock: number;
  unit: string;
}

interface PendingPayment {
  id: string;
  patientName: string;
  balance: number;
  description: string;
}

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface AlertsPanelProps {
  lowStock: LowStockItem[] | null; // null = module disabled
  pendingPayments: PendingPayment[] | null;
  quickActions: QuickAction[];
}

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function AlertsPanel({
  lowStock,
  pendingPayments,
  quickActions,
}: AlertsPanelProps) {
  return (
    <div className="space-y-4">
      {/* Low stock */}
      {lowStock && lowStock.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <header className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center">
                <AlertTriangle size={14} />
              </span>
              <h3 className="text-sm font-semibold text-gray-900">
                Stock crítico
              </h3>
            </div>
            <Link
              href="/inventory"
              className="text-xs font-medium text-blue-600 hover:underline inline-flex items-center gap-0.5"
            >
              Ver
              <ChevronRight size={14} />
            </Link>
          </header>
          <ul className="divide-y divide-gray-100">
            {lowStock.slice(0, 4).map((item) => (
              <li
                key={item.id}
                className="px-5 py-2.5 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.commercialName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Mínimo: {item.minStock} {item.unit.toLowerCase()}
                  </p>
                </div>
                <span className="ml-3 flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-md bg-red-50 text-red-700">
                  {item.quantity} {item.unit.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
          {lowStock.length > 4 && (
            <div className="px-5 py-2.5 border-t border-gray-100">
              <Link
                href="/inventory"
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                +{lowStock.length - 4} insumos más con stock bajo
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Pending payments */}
      {pendingPayments && pendingPayments.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <header className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
                <DollarSign size={14} />
              </span>
              <h3 className="text-sm font-semibold text-gray-900">
                Pagos pendientes
              </h3>
            </div>
            <Link
              href="/caja"
              className="text-xs font-medium text-blue-600 hover:underline inline-flex items-center gap-0.5"
            >
              Ver
              <ChevronRight size={14} />
            </Link>
          </header>
          <ul className="divide-y divide-gray-100">
            {pendingPayments.slice(0, 4).map((p) => (
              <li
                key={p.id}
                className="px-5 py-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {p.patientName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {p.description}
                  </p>
                </div>
                <span className="flex-shrink-0 text-sm font-semibold text-gray-900 tabular-nums">
                  {COP.format(p.balance)}
                </span>
              </li>
            ))}
          </ul>
          {pendingPayments.length > 4 && (
            <div className="px-5 py-2.5 border-t border-gray-100">
              <Link
                href="/caja"
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                +{pendingPayments.length - 4} pagos pendientes más
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Quick actions */}
      {quickActions.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <header className="px-5 py-3.5 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Acciones rápidas
            </h3>
          </header>
          <ul className="p-2 grid grid-cols-1 gap-1">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <li key={action.href}>
                  <Link
                    href={action.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
                      <Icon size={14} />
                    </span>
                    <span className="flex-1">{action.label}</span>
                    <ChevronRight size={14} className="text-gray-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

export const ACTION_ICONS = { Plus, UserPlus, CalendarPlus };
