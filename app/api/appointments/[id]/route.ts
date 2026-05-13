import type { NextRequest } from "next/server"
import { verifySession } from "@/lib/dal"
import { appointmentsService } from "@/lib/services/appointments.service"
import { handleApiError } from "@/lib/errors"

type Params = Promise<{ id: string }>

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  await verifySession()
  const { id } = await ctx.params

  try {
    await appointmentsService.cancel(id)
    return new Response(null, { status: 204 })
  } catch (error) {
    return handleApiError(error)
  }
}
