import { verifySession } from "@/lib/dal";
import { getAccessibleModules, AppModule } from "@/lib/modules";
import { appointmentsService } from "@/lib/services/appointments.service";
import { inventoryService } from "@/lib/services/inventory.service";
import { cajaService } from "@/lib/services/caja.service";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TodaySchedule } from "@/components/dashboard/today-schedule";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import {
  Clock,
  CalendarDays,
  DollarSign,
  Package,
  UserPlus,
  CalendarPlus,
} from "lucide-react";

/* ── Bogotá time helpers ──────────────────────────────────── */
const COLOMBIA_OFFSET_MS = 5 * 3600 * 1000;

function getBogotaTodayRange() {
  const now = new Date();
  const colombiaNow = new Date(now.getTime() - COLOMBIA_OFFSET_MS);
  const y = colombiaNow.getUTCFullYear();
  const m = colombiaNow.getUTCMonth();
  const d = colombiaNow.getUTCDate();
  // Midnight Bogotá = 05:00 UTC
  const start = new Date(Date.UTC(y, m, d, 5, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, d + 1, 4, 59, 59, 999));
  return { start, end, now };
}

function bogotaGreeting(now: Date): string {
  const colombiaHour = Number(
    new Intl.DateTimeFormat("es-CO", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Bogota",
    }).format(now)
  );
  if (colombiaHour >= 5 && colombiaHour < 12) return "Buenos días";
  if (colombiaHour >= 12 && colombiaHour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function formatBogotaDate(now: Date): string {
  const formatted = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(now);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatTimeBogota(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Bogota",
  });
}

/* ── Page ─────────────────────────────────────────────────── */
export default async function DashboardPage() {
  const session = await verifySession();
  const accessible = await getAccessibleModules(
    session.organizationId,
    session.role,
    session.doctorId
  );

  const hasAppointments = accessible.has(AppModule.APPOINTMENTS);
  const hasInventory = accessible.has(AppModule.INVENTORY);
  const hasCaja = accessible.has(AppModule.CAJA);
  const hasPatients = accessible.has(AppModule.PATIENTS);

  const { start, end, now } = getBogotaTodayRange();

  /* Parallel data fetch — only request what's accessible */
  const [appointmentsToday, lowStock, pendingCaja] = await Promise.all([
    hasAppointments
      ? appointmentsService.listByDateRange(
          start,
          end,
          session.organizationId,
          session.role,
          session.doctorId
        )
      : Promise.resolve([]),
    hasInventory
      ? inventoryService.getLowStockAlerts(session.organizationId)
      : Promise.resolve(null),
    hasCaja
      ? cajaService.list({
          organizationId: session.organizationId,
          status: "PENDIENTE",
          pageSize: 10,
        })
      : Promise.resolve(null),
  ]);

  /* Derived stats */
  const nowMs = now.getTime();
  const completedToday = appointmentsToday.filter(
    (apt) => new Date(apt.date).getTime() < nowMs
  ).length;
  const upcomingToday = appointmentsToday.length - completedToday;
  const nextAppt = appointmentsToday.find(
    (apt) => new Date(apt.date).getTime() >= nowMs
  );

  const lowStockMapped = lowStock
    ? lowStock.map((item) => ({
        id: item.id,
        commercialName: item.commercialName,
        quantity: Number(item.quantity),
        minStock: Number(item.minStock),
        unit: item.unit,
      }))
    : null;

  const pendingPaymentsMapped = pendingCaja
    ? pendingCaja.records.map((r) => ({
        id: r.id,
        patientName: `${r.patient.firstName} ${r.patient.lastName}`,
        balance: Number(r.balance),
        description: r.description,
      }))
    : null;

  const pendingTotal = pendingPaymentsMapped
    ? pendingPaymentsMapped.reduce((sum, p) => sum + p.balance, 0)
    : 0;

  /* Quick actions — only show what user has access to */
  const quickActions = [
    hasAppointments && {
      label: "Nueva cita",
      href: "/appointments",
      icon: CalendarPlus,
    },
    hasPatients && {
      label: "Nuevo paciente",
      href: "/patients",
      icon: UserPlus,
    },
  ].filter(Boolean) as { label: string; href: string; icon: typeof CalendarPlus }[];

  const COP = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
    notation: pendingTotal >= 1_000_000 ? "compact" : "standard",
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Greeting ─────────────────────────────────────── */}
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
          {bogotaGreeting(now)}, {session.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{formatBogotaDate(now)}</p>
      </header>

      {/* ── KPI Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {hasAppointments && (
          <KpiCard
            icon={Clock}
            label="Próxima cita"
            value={nextAppt ? formatTimeBogota(nextAppt.date) : "—"}
            subtitle={
              nextAppt
                ? `${nextAppt.patient.firstName} ${nextAppt.patient.lastName}`
                : "Sin más citas hoy"
            }
            accent="blue"
            href={nextAppt ? `/patients/${nextAppt.patientId}` : "/appointments"}
          />
        )}

        {hasAppointments && (
          <KpiCard
            icon={CalendarDays}
            label="Citas hoy"
            value={String(appointmentsToday.length)}
            subtitle={
              appointmentsToday.length > 0
                ? `${completedToday} completadas · ${upcomingToday} pendientes`
                : "Día sin citas"
            }
            accent="green"
            href="/appointments"
          />
        )}

        {hasCaja && pendingPaymentsMapped && (
          <KpiCard
            icon={DollarSign}
            label="Pagos pendientes"
            value={
              pendingTotal > 0 ? COP.format(pendingTotal) : "$0"
            }
            subtitle={
              pendingPaymentsMapped.length > 0
                ? `${pendingPaymentsMapped.length} ${
                    pendingPaymentsMapped.length === 1 ? "cuenta" : "cuentas"
                  } por cobrar`
                : "Todo al día"
            }
            accent="amber"
            href="/caja"
          />
        )}

        {hasInventory && lowStockMapped && (
          <KpiCard
            icon={Package}
            label="Stock bajo"
            value={String(lowStockMapped.length)}
            subtitle={
              lowStockMapped.length > 0
                ? `${lowStockMapped.length === 1 ? "insumo" : "insumos"} requieren reposición`
                : "Inventario en orden"
            }
            accent={lowStockMapped.length > 0 ? "red" : "green"}
            href="/inventory"
          />
        )}
      </div>

      {/* ── Main two-column area ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          {hasAppointments ? (
            <TodaySchedule
              appointments={appointmentsToday}
              showDoctorName={session.role === "ADMIN"}
              now={now}
            />
          ) : (
            <section className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-500">
                El módulo de agendamiento no está habilitado.
              </p>
            </section>
          )}
        </div>

        <aside className="lg:col-span-1">
          <AlertsPanel
            lowStock={lowStockMapped}
            pendingPayments={pendingPaymentsMapped}
            quickActions={quickActions}
          />
        </aside>
      </div>
    </div>
  );
}
