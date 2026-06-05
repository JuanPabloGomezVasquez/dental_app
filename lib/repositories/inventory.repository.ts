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
    organizationId: string;
    search?: string;
    categoryId?: string;
    active?: boolean;
  }): Promise<InventoryItemWithCategory[]>;
  findById(id: string, organizationId: string): Promise<InventoryItemWithCategory | null>;
  findBySku(sku: string, organizationId: string): Promise<InventoryItem | null>;
  findCategoryById(id: string, organizationId: string): Promise<InventoryCategory | null>;
  countAll(organizationId: string): Promise<number>;
  create(data: CreateInventoryItemInput & { organizationId: string; sku: string }): Promise<InventoryItemWithCategory>;
  update(id: string, organizationId: string, data: UpdateInventoryItemInput): Promise<InventoryItemWithCategory>;
  setActive(id: string, organizationId: string, active: boolean): Promise<InventoryItem>;
  updateStock(id: string, previousQty: Prisma.Decimal, newQty: number): Promise<InventoryItem>;
  countLowStock(organizationId: string): Promise<number>;
  getLowStockItems(organizationId: string): Promise<LowStockAlert[]>;
  findAllCategories(organizationId: string): Promise<InventoryCategory[]>;
}

const repo: InventoryRepository = {
  findAll({ organizationId, search, categoryId, active } = { organizationId: "" }) {
    return db.inventoryItem.findMany({
      where: {
        organizationId,
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

  findById(id, organizationId) {
    return db.inventoryItem.findFirst({
      where: { id, organizationId },
      include: { category: CATEGORY_SELECT },
    });
  },

  findBySku(sku, organizationId) {
    return db.inventoryItem.findFirst({ where: { sku, organizationId } });
  },

  findCategoryById(id, organizationId) {
    return db.inventoryCategory.findFirst({ where: { id, organizationId } });
  },

  countAll(organizationId) {
    return db.inventoryItem.count({ where: { organizationId } });
  },

  create(data) {
    return db.inventoryItem.create({
      data,
      include: { category: CATEGORY_SELECT },
    });
  },

  update(id, organizationId, data) {
    return db.inventoryItem.update({
      where: { id },
      data: { ...data, organizationId },
      include: { category: CATEGORY_SELECT },
    });
  },

  setActive(id, organizationId, active) {
    return db.inventoryItem.update({ where: { id }, data: { active, organizationId } });
  },

  async updateStock(id, previousQty, newQty) {
    const [updatedItem] = await db.$transaction([
      db.inventoryItem.update({ where: { id }, data: { quantity: newQty } }),
      db.stockLog.create({
        data: { itemId: id, previousQty, newQty },
      }),
    ]);
    return updatedItem;
  },

  async countLowStock(organizationId) {
    const items = await db.inventoryItem.findMany({
      where: { organizationId, active: true },
      select: { quantity: true, minStock: true },
    });
    return items.filter((i) => i.quantity.lessThan(i.minStock)).length;
  },

  async getLowStockItems(organizationId) {
    const items = await db.inventoryItem.findMany({ where: { organizationId, active: true } });
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

  findAllCategories(organizationId) {
    return db.inventoryCategory.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
  },
};

export const inventoryRepository = repo;
