import { db } from "@/lib/db";
import type { InventoryItem, InventoryCategory, Prisma } from "@prisma/client";
import type {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
} from "@/lib/validations/inventory.schema";

export type InventoryItemWithCategory = InventoryItem & {
  category: Pick<InventoryCategory, "id" | "name">;
};

export type LowStockAlert = {
  id: string;
  commercialName: string;
  quantity: Prisma.Decimal;
  minStock: Prisma.Decimal;
  unit: string;
};

const CATEGORY_SELECT = { select: { id: true, name: true } } as const;

interface InventoryRepository {
  findAll(options?: {
    search?: string;
    categoryId?: string;
    active?: boolean;
  }): Promise<InventoryItemWithCategory[]>;
  findById(id: string): Promise<InventoryItemWithCategory | null>;
  findBySku(sku: string): Promise<InventoryItem | null>;
  create(data: CreateInventoryItemInput): Promise<InventoryItemWithCategory>;
  update(id: string, data: UpdateInventoryItemInput): Promise<InventoryItemWithCategory>;
  setActive(id: string, active: boolean): Promise<InventoryItem>;
  updateStock(
    id: string,
    previousQty: Prisma.Decimal,
    newQty: number,
    reason?: string
  ): Promise<InventoryItem>;
  countLowStock(): Promise<number>;
  getLowStockItems(): Promise<LowStockAlert[]>;
  findAllCategories(): Promise<InventoryCategory[]>;
}

const repo: InventoryRepository = {
  findAll({ search, categoryId, active } = {}) {
    return db.inventoryItem.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { commercialName: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(active !== undefined ? { active } : {}),
      },
      include: { category: CATEGORY_SELECT },
      orderBy: { commercialName: "asc" },
    });
  },

  findById(id) {
    return db.inventoryItem.findUnique({
      where: { id },
      include: { category: CATEGORY_SELECT },
    });
  },

  findBySku(sku) {
    return db.inventoryItem.findUnique({ where: { sku } });
  },

  create(data) {
    return db.inventoryItem.create({
      data,
      include: { category: CATEGORY_SELECT },
    });
  },

  update(id, data) {
    return db.inventoryItem.update({
      where: { id },
      data,
      include: { category: CATEGORY_SELECT },
    });
  },

  setActive(id, active) {
    return db.inventoryItem.update({ where: { id }, data: { active } });
  },

  async updateStock(id, previousQty, newQty, reason) {
    const [updatedItem] = await db.$transaction([
      db.inventoryItem.update({ where: { id }, data: { quantity: newQty } }),
      db.stockLog.create({
        data: { itemId: id, previousQty, newQty, reason },
      }),
    ]);
    return updatedItem;
  },

  async countLowStock() {
    const items = await db.inventoryItem.findMany({
      where: { active: true },
      select: { quantity: true, minStock: true },
    });
    return items.filter((i) => i.quantity.lessThan(i.minStock)).length;
  },

  async getLowStockItems() {
    const items = await db.inventoryItem.findMany({ where: { active: true } });
    return items
      .filter((i) => i.quantity.lessThan(i.minStock))
      .map((i) => ({
        id: i.id,
        commercialName: i.commercialName,
        quantity: i.quantity,
        minStock: i.minStock,
        unit: i.unit,
      }));
  },

  findAllCategories() {
    return db.inventoryCategory.findMany({ orderBy: { name: "asc" } });
  },
};

export const inventoryRepository = repo;
