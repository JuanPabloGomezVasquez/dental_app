import { verifySession } from "@/lib/dal";
import { getAccessibleModules, requireModuleAccess, AppModule } from "@/lib/modules";
import { inventoryService } from "@/lib/services/inventory.service";
import { InventoryPageClient } from "@/components/inventory/inventory-page-client";

export default async function InventoryPage() {
  const session = await verifySession();
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId);
  requireModuleAccess(accessible, AppModule.INVENTORY);

  const [items, categories] = await Promise.all([
    inventoryService.list({ organizationId: session.organizationId }),
    inventoryService.listCategories(session.organizationId),
  ]);
  return <InventoryPageClient initialItems={items} categories={categories} />;
}

