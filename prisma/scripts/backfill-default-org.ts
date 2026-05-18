import { PrismaClient, AppModule } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const existing = await db.organization.findUnique({
    where: { slug: "clinica-principal" },
  });

  const org =
    existing ??
    (await db.organization.create({
      data: { name: "Clínica Principal", slug: "clinica-principal" },
    }));

  console.log(`Organization: ${org.id} (${org.name})`);

  // Note: organizationId is now NOT NULL — this script was run before schema hardening.
  // Filter by rows NOT already pointing to this org to remain idempotent.
  const [users, doctors, patients, appointments, procedures, categories, items, cajaRecords] =
    await Promise.all([
      db.user.findMany({ where: { NOT: { organizationId: org.id } } }),
      db.doctor.findMany({ where: { NOT: { organizationId: org.id } } }),
      db.patient.findMany({ where: { NOT: { organizationId: org.id } } }),
      db.appointment.findMany({ where: { NOT: { organizationId: org.id } } }),
      db.procedure.findMany({ where: { NOT: { organizationId: org.id } } }),
      db.inventoryCategory.findMany({ where: { NOT: { organizationId: org.id } } }),
      db.inventoryItem.findMany({ where: { NOT: { organizationId: org.id } } }),
      db.cajaRecord.findMany({ where: { NOT: { organizationId: org.id } } }),
    ]);

  await db.$transaction([
    db.user.updateMany({
      where: { id: { in: users.map((r) => r.id) } },
      data: { organizationId: org.id },
    }),
    db.doctor.updateMany({
      where: { id: { in: doctors.map((r) => r.id) } },
      data: { organizationId: org.id },
    }),
    db.patient.updateMany({
      where: { id: { in: patients.map((r) => r.id) } },
      data: { organizationId: org.id },
    }),
    db.appointment.updateMany({
      where: { id: { in: appointments.map((r) => r.id) } },
      data: { organizationId: org.id },
    }),
    db.procedure.updateMany({
      where: { id: { in: procedures.map((r) => r.id) } },
      data: { organizationId: org.id },
    }),
    db.inventoryCategory.updateMany({
      where: { id: { in: categories.map((r) => r.id) } },
      data: { organizationId: org.id },
    }),
    db.inventoryItem.updateMany({
      where: { id: { in: items.map((r) => r.id) } },
      data: { organizationId: org.id },
    }),
    db.cajaRecord.updateMany({
      where: { id: { in: cajaRecords.map((r) => r.id) } },
      data: { organizationId: org.id },
    }),
  ]);

  const allModules = Object.values(AppModule);
  for (const module of allModules) {
    await db.orgModule.upsert({
      where: { organizationId_module: { organizationId: org.id, module } },
      update: {},
      create: { organizationId: org.id, module, enabled: true },
    });
  }

  console.log("✓ Backfill completado");
  console.log(`  Users: ${users.length}, Doctors: ${doctors.length}, Patients: ${patients.length}`);
  console.log(`  Appointments: ${appointments.length}, Procedures: ${procedures.length}`);
  console.log(`  Categories: ${categories.length}, Items: ${items.length}, CajaRecords: ${cajaRecords.length}`);
  console.log(`  OrgModules seeded: ${allModules.length}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
