import { test as base } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL } },
});

type DbFixtures = {
  seedDoctor: { id: string; name: string };
  seedProcedure: { id: string; name: string };
  seedPatient: { id: string; idNumber: string };
};

export const test = base.extend<DbFixtures>({
  seedDoctor: async ({}, use) => {
    const doctor = await db.doctor.create({
      data: { name: "Dr. Test E2E", specialty: "Odontología General", active: true },
    });
    await use(doctor);
    await db.doctor.delete({ where: { id: doctor.id } }).catch(() => undefined);
  },

  seedProcedure: async ({}, use) => {
    const procedure = await db.procedure.create({
      data: { name: "Limpieza E2E", active: true },
    });
    await use(procedure);
    await db.procedure.delete({ where: { id: procedure.id } }).catch(() => undefined);
  },

  seedPatient: async ({}, use) => {
    const patient = await db.patient.create({
      data: {
        firstName: "Paciente",
        lastName: "Test",
        idNumber: `TEST-${Date.now()}`,
        phone: "3001234567",
        habeaDataConsent: true,
      },
    });
    await use(patient);
    await db.patient.delete({ where: { id: patient.id } }).catch(() => undefined);
  },
});

export { db };
