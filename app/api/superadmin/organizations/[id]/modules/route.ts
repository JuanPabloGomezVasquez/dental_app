import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdmin } from "@/lib/dal";
import { superadminService } from "@/lib/services/superadmin.service";
import { setOrgModuleSchema } from "@/lib/validations/organization.schema";
import { handleApiError, ValidationError } from "@/lib/errors";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await verifySuperAdmin();
    const { id } = await params;
    const body = await req.json();
    const result = setOrgModuleSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0]?.message ?? "Datos inválidos");
    }
    await superadminService.setOrgModule(id, result.data.module, result.data.enabled);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
