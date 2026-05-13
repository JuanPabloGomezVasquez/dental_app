import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 12);

  await db.user.upsert({
    where: { email: "admin@clinica.com" },
    update: {},
    create: {
      email: "admin@clinica.com",
      hashedPassword,
      name: "Administrador",
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
    await db.inventoryCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("✓ Seed completado");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
