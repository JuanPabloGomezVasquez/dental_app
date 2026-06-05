import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundError } from "@/lib/errors";

vi.mock("@/lib/repositories/inventory.repository", () => ({
  inventoryRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findBySku: vi.fn(),
    findCategoryById: vi.fn(),
    countAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setActive: vi.fn(),
    updateStock: vi.fn(),
    countLowStock: vi.fn(),
    getLowStockItems: vi.fn(),
    findAllCategories: vi.fn(),
  },
}));

import { inventoryService } from "@/lib/services/inventory.service";
import { inventoryRepository } from "@/lib/repositories/inventory.repository";

const repo = vi.mocked(inventoryRepository);

const ORG_ID = "org-1";
const CATEGORY_ID = "cat-1";
const BASE_ITEM = {
  id: "item-1",
  commercialName: "Guantes",
  genericName: null,
  sku: "GUA001",
  categoryId: CATEGORY_ID,
  quantity: { toString: () => "10", lessThan: () => false } as never,
  minStock: { toString: () => "5", lessThan: () => false } as never,
  unit: "CAJA" as never,
  active: true,
  organizationId: ORG_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: { id: CATEGORY_ID, name: "Guantes" },
};

const CATEGORY = { id: CATEGORY_ID, name: "Guantes y Protección", organizationId: ORG_ID, createdAt: new Date(), updatedAt: new Date() };

beforeEach(() => vi.clearAllMocks());

describe("inventoryService.create — SKU auto-generation", () => {
  it("generates SKU from first 3 letters of category + sequential count", async () => {
    repo.findCategoryById.mockResolvedValue(CATEGORY);
    repo.countAll.mockResolvedValue(0);
    repo.create.mockResolvedValue(BASE_ITEM);

    await inventoryService.create(
      { commercialName: "Guantes", categoryId: CATEGORY_ID, quantity: 10, unit: "CAJA" as never, minStock: 5 },
      ORG_ID
    );

    const [createArg] = repo.create.mock.calls[0]!;
    expect(createArg.sku).toBe("GUA001");
  });

  it("increments sequence based on existing item count", async () => {
    repo.findCategoryById.mockResolvedValue(CATEGORY);
    repo.countAll.mockResolvedValue(4);
    repo.create.mockResolvedValue(BASE_ITEM);

    await inventoryService.create(
      { commercialName: "Mascarillas", categoryId: CATEGORY_ID, quantity: 100, unit: "CAJA" as never, minStock: 10 },
      ORG_ID
    );

    const [createArg] = repo.create.mock.calls[0]!;
    expect(createArg.sku).toBe("GUA005");
  });

  it("strips accents from category name for prefix", async () => {
    repo.findCategoryById.mockResolvedValue({
      ...CATEGORY,
      name: "Óptica y Visión",
    });
    repo.countAll.mockResolvedValue(2);
    repo.create.mockResolvedValue(BASE_ITEM);

    await inventoryService.create(
      { commercialName: "Lentes", categoryId: CATEGORY_ID, quantity: 5, unit: "UNIDAD" as never, minStock: 1 },
      ORG_ID
    );

    // "Óptica y Visión" → strip accents → "Optica y Vision" → remove non-alpha → "OpticayVision"
    // → slice(0,3) → "Opt" → toUpperCase → "OPT" → sequence 3 → "OPT003"
    const [createArg] = repo.create.mock.calls[0]!;
    expect(createArg.sku).toBe("OPT003");
  });

  it("throws NotFoundError when category does not exist", async () => {
    repo.findCategoryById.mockResolvedValue(null);
    repo.countAll.mockResolvedValue(0);

    await expect(
      inventoryService.create(
        { commercialName: "Test", categoryId: "nonexistent", quantity: 1, unit: "UNIDAD" as never, minStock: 0 },
        ORG_ID
      )
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("pads sequence number to 3 digits", async () => {
    repo.findCategoryById.mockResolvedValue({ ...CATEGORY, name: "Mat" });
    repo.countAll.mockResolvedValue(99);
    repo.create.mockResolvedValue(BASE_ITEM);

    await inventoryService.create(
      { commercialName: "Item", categoryId: CATEGORY_ID, quantity: 1, unit: "UNIDAD" as never, minStock: 0 },
      ORG_ID
    );

    const [createArg] = repo.create.mock.calls[0]!;
    expect(createArg.sku).toBe("MAT100");
  });
});

describe("inventoryService.updateStock", () => {
  it("calls repository without reason parameter", async () => {
    repo.findById.mockResolvedValueOnce(BASE_ITEM).mockResolvedValueOnce({ ...BASE_ITEM, quantity: { toString: () => "20" } as never });
    repo.updateStock.mockResolvedValue({ ...BASE_ITEM });

    await inventoryService.updateStock("item-1", ORG_ID, { newQuantity: 20 });

    expect(repo.updateStock).toHaveBeenCalledWith("item-1", BASE_ITEM.quantity, 20);
    expect(repo.updateStock.mock.calls[0]).toHaveLength(3);
  });
});
