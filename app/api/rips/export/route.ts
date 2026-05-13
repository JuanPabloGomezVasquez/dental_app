import { z } from "zod";
import { verifySession } from "@/lib/dal";
import { buildRipsJson } from "@/lib/integrations/rips/mapper";
import { handleApiError } from "@/lib/errors";

const MAX_RANGE_MS = 365 * 24 * 60 * 60 * 1000;

const querySchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dateFrom debe tener formato YYYY-MM-DD"),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dateTo debe tener formato YYYY-MM-DD"),
});

export async function GET(req: Request): Promise<Response> {
  await verifySession();

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    dateFrom: searchParams.get("dateFrom"),
    dateTo: searchParams.get("dateTo"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Parámetros inválidos";
    return Response.json({ error: message }, { status: 400 });
  }

  const { dateFrom: dateFromStr, dateTo: dateToStr } = parsed.data;
  const dateFrom = new Date(`${dateFromStr}T00:00:00.000Z`);
  const dateTo = new Date(`${dateToStr}T23:59:59.999Z`);

  if (dateFrom > dateTo) {
    return Response.json({ error: "El rango de fechas es inválido" }, { status: 400 });
  }

  if (dateTo.getTime() - dateFrom.getTime() > MAX_RANGE_MS) {
    return Response.json({ error: "El rango máximo permitido es 12 meses" }, { status: 400 });
  }

  try {
    const ripsJson = await buildRipsJson(dateFrom, dateTo);
    return new Response(JSON.stringify(ripsJson, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="rips-${dateFromStr}-${dateToStr}.json"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
