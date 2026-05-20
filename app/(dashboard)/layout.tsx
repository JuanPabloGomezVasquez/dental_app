import { Toaster } from "sonner";
import { verifySession } from "@/lib/dal";
import Sidebar from "@/components/layout/sidebar";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { inventoryService } from "@/lib/services/inventory.service";
import { getAccessibleModules, AppModule } from "@/lib/modules";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  const accessibleModules = await getAccessibleModules(
    session.organizationId,
    session.role,
    session.doctorId
  );

  const hasInventory = accessibleModules.has(AppModule.INVENTORY);
  const alertCount = hasInventory
    ? await inventoryService.getLowStockCount(session.organizationId)
    : 0;

  const sidebar = (
    <Sidebar
      userName={session.name}
      isAdmin={session.role === "ADMIN"}
      enabledModules={[...accessibleModules]}
      inventoryAlerts={alertCount}
    />
  );

  return (
    <>
      <DashboardShell sidebar={sidebar}>{children}</DashboardShell>
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}
