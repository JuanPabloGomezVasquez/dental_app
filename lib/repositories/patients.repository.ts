import { db } from "@/lib/db";
import type { Patient, Prisma } from "@prisma/client";
import type { CreatePatientInput, UpdatePatientInput } from "@/lib/validations/patient.schema";

export type PatientListResult = {
  patients: Patient[];
  total: number;
};

type CreateData = Omit<CreatePatientInput, "birthDate"> & {
  birthDate?: Date;
  organizationId: string;
};
type UpdateData = Omit<UpdatePatientInput, "birthDate"> & { birthDate?: Date };

type AnonymizeData = {
  firstName: string;
  lastName: string;
  idNumber: string;
  phone: string;
  email: null;
  birthDate: null;
  address: null;
  guardianName: null;
  guardianPhone: null;
  guardianRelation: null;
  habeaDataConsent: boolean;
};

export type PatientFullExport = Prisma.PatientGetPayload<{
  include: {
    appointments: {
      include: {
        doctor: { select: { name: true } };
        procedure: { select: { name: true } };
      };
    };
    clinicalHistory: {
      include: { notes: true };
    };
    cajaRecords: {
      include: { payments: true };
    };
  };
}>;

interface PatientsRepository {
  findAll(options?: {
    organizationId: string;
    search?: string;
    skip?: number;
    take?: number;
  }): Promise<PatientListResult>;
  findById(id: string, organizationId: string): Promise<Patient | null>;
  findByIdNumber(idNumber: string, organizationId: string): Promise<Patient | null>;
  findFullExport(id: string, organizationId: string): Promise<PatientFullExport | null>;
  create(data: CreateData): Promise<Patient>;
  update(id: string, organizationId: string, data: UpdateData): Promise<Patient>;
  anonymize(id: string, data: AnonymizeData): Promise<void>;
  createClinicalHistory(patientId: string): Promise<void>;
}

const repo: PatientsRepository = {
  async findAll({ organizationId, search, skip = 0, take = 20 } = { organizationId: "" }) {
    const where: Prisma.PatientWhereInput = {
      organizationId,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
              { idNumber: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [patients, total] = await db.$transaction([
      db.patient.findMany({
        where,
        skip,
        take,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      db.patient.count({ where }),
    ]);

    return { patients, total };
  },

  findById(id, organizationId) {
    return db.patient.findFirst({ where: { id, organizationId } });
  },

  findByIdNumber(idNumber, organizationId) {
    return db.patient.findFirst({ where: { idNumber, organizationId } });
  },

  create(data) {
    return db.patient.create({ data });
  },

  update(id, organizationId, data) {
    return db.patient.update({ where: { id }, data: { ...data, organizationId } });
  },

  findFullExport(id, organizationId) {
    return db.patient.findFirst({
      where: { id, organizationId },
      include: {
        appointments: {
          include: {
            doctor: { select: { name: true } },
            procedure: { select: { name: true } },
          },
          orderBy: { date: "asc" },
        },
        clinicalHistory: {
          include: { notes: { orderBy: { createdAt: "desc" } } },
        },
        cajaRecords: {
          include: { payments: { orderBy: { createdAt: "asc" } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  },

  async anonymize(id, data) {
    await db.patient.update({ where: { id }, data });
  },

  async createClinicalHistory(patientId) {
    await db.clinicalHistory.create({ data: { patientId } });
  },
};

export const patientsRepository = repo;
