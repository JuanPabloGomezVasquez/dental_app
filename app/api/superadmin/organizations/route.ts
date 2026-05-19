import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdmin } from "@/lib/dal";
import { superadminService } from "@/lib/services/superadmin.service";
import { createOrganizationSchema } from "@/lib/validations/organization.schema";
import { handleApiError, ValidationError } from "@/lib/errors";

export async function GET() {
  try {
    await verifySuperAdmin();
    const organizations = await superadminService.listOrganizations();
    return NextResponse.json(organizations);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifySuperAdmin();
    const body = await req.json();
    const result = createOrganizationSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0]?.message ?? "Datos inválidos");
    }
    const org = await superadminService.createOrganization(result.data);
    return NextResponse.json(org, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
