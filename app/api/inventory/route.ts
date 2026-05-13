import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { inventoryService } from "@/lib/services/inventory.service";
import { createInventoryItemSchema } from "@/lib/validations/inventory.schema";
import { handleApiError } from "@/lib/errors";

export async function GET(request: NextRequest): Promise<Response> {
  await verifySession();

  const params = request.nextUrl.searchParams;
  const search = params.get("search") ?? undefined;
  const categoryId = params.get("categoryId") ?? undefined;
  const activeParam = params.get("active");
  const active =
    activeParam === "true" ? true : activeParam === "false" ? false : undefined;

  const items = await inventoryService.list({ search, categoryId, active });
  return Response.json(items);
}

export async function POST(request: NextRequest): Promise<Response> {
  await verifySession();

  const body: unknown = await request.json();
  const parsed = createInventoryItemSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const item = await inventoryService.create(parsed.data);
    return Response.json(item, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
