import { db } from "@/lib/db";
import type { Patient, Prisma } from "@prisma/client";
import type { CreatePatientInput, UpdatePatientInput } from "@/lib/validations/patient.schema";

export type PatientListResult = {
  patients: Patient[];
  total: number;
};

type CreateData = Omit<CreatePatientInput, "birthDate"> & { birthDate?: Date };
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
  findAll(options?: { search?: string; skip?: number; take?: number }): Promise<PatientListResult>;
  findById(id: string): Promise<Patient | null>;
  findByIdNumber(idNumber: string): Promise<Patient | null>;
  findFullExport(id: string): Promise<PatientFullExport | null>;
  create(data: CreateData): Promise<Patient>;
  update(id: string, data: UpdateData): Promise<Patient>;
  anonymize(id: string, data: AnonymizeData): Promise<void>;
  createClinicalHistory(patientId: string): Promise<void>;
}

const repo: PatientsRepository = {
  async findAll({ search, skip = 0, take = 20 } = {}) {
    const where = search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { idNumber: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : undefined;

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

  findById(id) {
    return db.patient.findUnique({ where: { id } });
  },

  findByIdNumber(idNumber) {
    return db.patient.findUnique({ where: { idNumber } });
  },

  create(data) {
    return db.patient.create({ data });
  },

  update(id, data) {
    return db.patient.update({ where: { id }, data });
  },

  findFullExport(id) {
    return db.patient.findUnique({
      where: { id },
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
