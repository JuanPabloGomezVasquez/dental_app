import { PrismaClient, AppModule } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const org = await db.organization.upsert({
    where: { slug: "clinica-principal" },
    update: {},
    create: { name: "Clínica Principal", slug: "clinica-principal" },
  });

  const hashedPassword = await bcrypt.hash("admin123", 12);

  await db.user.upsert({
    where: { email: "admin@clinica.com" },
    update: {},
    create: {
      email: "admin@clinica.com",
      hashedPassword,
      name: "Administrador",
      role: "ADMIN",
      organizationId: org.id,
    },
  });

  const categories = [
    "Material restaurativo",
    "Instrumental desechable",
    "Medicamento",
    "Bioseguridad",
    "Ortodoncia",
    "Endodoncia",
    "Otro",
  ];

  for (const name of categories) {
    const existing = await db.inventoryCategory.findFirst({
      where: { name, organizationId: org.id },
    });
    if (!existing) {
      await db.inventoryCategory.create({ data: { name, organizationId: org.id } });
    }
  }

  for (const module of Object.values(AppModule)) {
    await db.orgModule.upsert({
      where: { organizationId_module: { organizationId: org.id, module } },
      update: {},
      create: { organizationId: org.id, module, enabled: true },
    });
  }

  // Super admin (platform owner) — no organizationId
  const superAdminPassword = await bcrypt.hash("superadmin123", 12);
  await db.user.upsert({
    where: { email: "superadmin@dentapp.com" },
    update: {},
    create: {
      email: "superadmin@dentapp.com",
      hashedPassword: superAdminPassword,
      name: "Super Admin",
      role: "SUPER_ADMIN",
      organizationId: null,
    },
  });

  console.log("✓ Seed completado");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
