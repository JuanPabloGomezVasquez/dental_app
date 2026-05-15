import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { inventoryService } from "@/lib/services/inventory.service";
import {
  updateInventoryItemSchema,
  toggleInventorySchema,
} from "@/lib/validations/inventory.schema";
import { handleApiError } from "@/lib/errors";

type Params = Promise<{ id: string }>;

export async function GET(
  _req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  await verifySession();
  const { id } = await ctx.params;

  try {
    const item = await inventoryService.get(id);
    return Response.json(item);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  await verifySession();
  const { id } = await ctx.params;

  const body: unknown = await req.json();
  const parsed = updateInventoryItemSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const item = await inventoryService.update(id, parsed.data);
    return Response.json(item);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  await verifySession();
  const { id } = await ctx.params;

  const body: unknown = await req.json();
  const parsed = toggleInventorySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    await inventoryService.setActive(id, parsed.data.active);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
