import { inventoryRepository } from "@/lib/repositories/inventory.repository";
import type {
  InventoryItemWithCategory,
  LowStockAlert,
} from "@/lib/repositories/inventory.repository";
import type {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  UpdateStockInput,
} from "@/lib/validations/inventory.schema";
import type { InventoryCategory } from "@prisma/client";
import { NotFoundError } from "@/lib/errors";

interface InventoryService {
  list(options: {
    organizationId: string;
    search?: string;
    categoryId?: string;
    active?: boolean;
  }): Promise<InventoryItemWithCategory[]>;
  get(id: string, organizationId: string): Promise<InventoryItemWithCategory>;
  create(data: CreateInventoryItemInput, organizationId: string): Promise<InventoryItemWithCategory>;
  update(id: string, organizationId: string, data: UpdateInventoryItemInput): Promise<InventoryItemWithCategory>;
  setActive(id: string, organizationId: string, active: boolean): Promise<void>;
  updateStock(id: string, organizationId: string, data: UpdateStockInput): Promise<InventoryItemWithCategory>;
  getLowStockCount(organizationId: string): Promise<number>;
  getLowStockAlerts(organizationId: string): Promise<LowStockAlert[]>;
  listCategories(organizationId: string): Promise<Pick<InventoryCategory, "id" | "name">[]>;
}

async function generateSku(categoryId: string, organizationId: string): Promise<string> {
  const [category, totalCount] = await Promise.all([
    inventoryRepository.findCategoryById(categoryId, organizationId),
    inventoryRepository.countAll(organizationId),
  ]);

  if (!category) throw new NotFoundError("Categoría no encontrada");

  const prefix = category.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X");

  const seq = (totalCount + 1).toString().padStart(3, "0");
  return `${prefix}${seq}`;
}

const service: InventoryService = {
  list(options) {
    return inventoryRepository.findAll(options);
  },

  async get(id, organizationId) {
    const item = await inventoryRepository.findById(id, organizationId);
    if (!item) throw new NotFoundError("Insumo no encontrado");
    return item;
  },

  async create(data, organizationId) {
    const sku = await generateSku(data.categoryId, organizationId);
    return inventoryRepository.create({ ...data, organizationId, sku });
  },

  async update(id, organizationId, data) {
    const existing = await inventoryRepository.findById(id, organizationId);
    if (!existing) throw new NotFoundError("Insumo no encontrado");
    return inventoryRepository.update(id, organizationId, data);
  },

  async setActive(id, organizationId, active) {
    const existing = await inventoryRepository.findById(id, organizationId);
    if (!existing) throw new NotFoundError("Insumo no encontrado");
    await inventoryRepository.setActive(id, organizationId, active);
  },

  async updateStock(id, organizationId, data) {
    const existing = await inventoryRepository.findById(id, organizationId);
    if (!existing) throw new NotFoundError("Insumo no encontrado");
    await inventoryRepository.updateStock(id, existing.quantity, data.newQuantity);
    return (await inventoryRepository.findById(id, organizationId))!;
  },

  getLowStockCount(organizationId) {
    return inventoryRepository.countLowStock(organizationId);
  },

  getLowStockAlerts(organizationId) {
    return inventoryRepository.getLowStockItems(organizationId);
  },

  listCategories(organizationId) {
    return inventoryRepository.findAllCategories(organizationId);
  },
};

export const inventoryService = service;
