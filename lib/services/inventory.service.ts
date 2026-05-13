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
import { NotFoundError, ConflictError } from "@/lib/errors";

interface InventoryService {
  list(options?: {
    search?: string;
    categoryId?: string;
    active?: boolean;
  }): Promise<InventoryItemWithCategory[]>;
  get(id: string): Promise<InventoryItemWithCategory>;
  create(data: CreateInventoryItemInput): Promise<InventoryItemWithCategory>;
  update(id: string, data: UpdateInventoryItemInput): Promise<InventoryItemWithCategory>;
  setActive(id: string, active: boolean): Promise<void>;
  updateStock(id: string, data: UpdateStockInput): Promise<InventoryItemWithCategory>;
  getLowStockCount(): Promise<number>;
  getLowStockAlerts(): Promise<LowStockAlert[]>;
  listCategories(): Promise<Pick<InventoryCategory, "id" | "name">[]>;
}

const service: InventoryService = {
  list(options) {
    return inventoryRepository.findAll(options);
  },

  async get(id) {
    const item = await inventoryRepository.findById(id);
    if (!item) throw new NotFoundError("Insumo no encontrado");
    return item;
  },

  async create(data) {
    const existing = await inventoryRepository.findBySku(data.sku);
    if (existing) throw new ConflictError("Ya existe un insumo con ese SKU");
    return inventoryRepository.create(data);
  },

  async update(id, data) {
    const existing = await inventoryRepository.findById(id);
    if (!existing) throw new NotFoundError("Insumo no encontrado");
    if (data.sku && data.sku !== existing.sku) {
      const skuConflict = await inventoryRepository.findBySku(data.sku);
      if (skuConflict) throw new ConflictError("Ya existe un insumo con ese SKU");
    }
    return inventoryRepository.update(id, data);
  },

  async setActive(id, active) {
    const existing = await inventoryRepository.findById(id);
    if (!existing) throw new NotFoundError("Insumo no encontrado");
    await inventoryRepository.setActive(id, active);
  },

  async updateStock(id, data) {
    const existing = await inventoryRepository.findById(id);
    if (!existing) throw new NotFoundError("Insumo no encontrado");
    await inventoryRepository.updateStock(id, existing.quantity, data.newQuantity, data.reason);
    return (await inventoryRepository.findById(id))!;
  },

  getLowStockCount() {
    return inventoryRepository.countLowStock();
  },

  getLowStockAlerts() {
    return inventoryRepository.getLowStockItems();
  },

  listCategories() {
    return inventoryRepository.findAllCategories();
  },
};

export const inventoryService = service;
