import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { inventoryService } from "@/lib/services/inventory.service";
import { updateStockSchema } from "@/lib/validations/inventory.schema";
import { handleApiError } from "@/lib/errors";

type Params = Promise<{ id: string }>;

export async function POST(
  req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  await verifySession();
  const { id } = await ctx.params;

  const body: unknown = await req.json();
  const parsed = updateStockSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const item = await inventoryService.updateStock(id, parsed.data);
    return Response.json(item);
  } catch (error) {
    return handleApiError(error);
  }
}
