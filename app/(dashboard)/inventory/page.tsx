import { verifySession } from "@/lib/dal";
import { inventoryService } from "@/lib/services/inventory.service";
import { InventoryPageClient } from "@/components/inventory/inventory-page-client";

export default async function InventoryPage() {
  await verifySession();
  const [items, categories] = await Promise.all([
    inventoryService.list(),
    inventoryService.listCategories(),
  ]);
  return <InventoryPageClient initialItems={items} categories={categories} />;
}
