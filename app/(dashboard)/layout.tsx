import { Toaster } from "sonner";
import { verifySession } from "@/lib/dal";
import Sidebar from "@/components/layout/sidebar";
import { inventoryService } from "@/lib/services/inventory.service";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  const alertCount = await inventoryService.getLowStockCount();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar userName={session.name} inventoryAlerts={alertCount} />
      <main className="flex-1 overflow-auto">{children}</main>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
