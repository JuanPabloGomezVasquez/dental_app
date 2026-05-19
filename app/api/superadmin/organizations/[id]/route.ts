import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdmin } from "@/lib/dal";
import { superadminService } from "@/lib/services/superadmin.service";
import { updateOrganizationSchema } from "@/lib/validations/organization.schema";
import { handleApiError, ValidationError } from "@/lib/errors";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await verifySuperAdmin();
    const { id } = await params;
    const org = await superadminService.getOrgDetail(id);
    return NextResponse.json(org);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await verifySuperAdmin();
    const { id } = await params;
    const body = await req.json();
    const result = updateOrganizationSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0]?.message ?? "Datos inválidos");
    }
    const org = await superadminService.updateOrganization(id, result.data);
    return NextResponse.json(org);
  } catch (error) {
    return handleApiError(error);
  }
}
