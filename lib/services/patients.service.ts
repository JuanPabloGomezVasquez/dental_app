import type { Patient } from "@prisma/client";
import { randomBytes } from "crypto";
import { patientsRepository } from "@/lib/repositories/patients.repository";
import type { CreatePatientInput, UpdatePatientInput } from "@/lib/validations/patient.schema";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { encrypt, decrypt, encryptOptional, decryptOptional } from "@/lib/crypto";

export type PatientPage = {
  patients: Patient[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
};

export type PatientExport = {
  patient: Omit<Patient, "birthDate"> & { birthDate: string | null };
  appointments: {
    id: string;
    date: string;
    doctor: { name: string };
    procedure: { name: string };
  }[];
  clinicalHistory: {
    background: string | null;
    notes: { type: string; content: string; createdAt: string }[];
  } | null;
  cajaRecords: {
    id: string;
    description: string;
    total: string;
    balance: string;
    status: string;
    createdAt: string;
    payments: { amount: string; method: string; createdAt: string }[];
  }[];
};

interface PatientsService {
  list(options?: { search?: string; page?: number; pageSize?: number }): Promise<PatientPage>;
  get(id: string): Promise<Patient>;
  create(data: CreatePatientInput): Promise<Patient>;
  update(id: string, data: UpdatePatientInput): Promise<Patient>;
  exportData(id: string): Promise<PatientExport>;
  anonymize(id: string): Promise<void>;
}

function parseBirthDate(birthDate: string | undefined): Date | undefined {
  if (!birthDate) return undefined;
  const d = new Date(birthDate);
  return isNaN(d.getTime()) ? undefined : d;
}

function decryptPatient(patient: Patient): Patient {
  return {
    ...patient,
    phone: decrypt(patient.phone),
    address: decryptOptional(patient.address),
    guardianName: decryptOptional(patient.guardianName),
    guardianPhone: decryptOptional(patient.guardianPhone),
  };
}

const service: PatientsService = {
  async list({ search, page = 1, pageSize = 20 } = {}) {
    const skip = (page - 1) * pageSize;
    const { patients, total } = await patientsRepository.findAll({
      search: search || undefined,
      skip,
      take: pageSize,
    });
    const pages = Math.ceil(total / pageSize) || 1;
    return { patients: patients.map(decryptPatient), total, page, pages, pageSize };
  },

  async get(id) {
    const patient = await patientsRepository.findById(id);
    if (!patient) throw new NotFoundError("Paciente no encontrado");
    return decryptPatient(patient);
  },

  async create(data) {
    const existing = await patientsRepository.findByIdNumber(data.idNumber);
    if (existing) {
      throw new ConflictError("Ya existe un paciente con ese número de identificación");
    }

    const { birthDate: birthDateStr, ...rest } = data;
    const birthDate = parseBirthDate(birthDateStr);

    const patient = await patientsRepository.create({
      ...rest,
      birthDate,
      phone: encrypt(rest.phone),
      address: encryptOptional(rest.address) ?? undefined,
      guardianName: encryptOptional(rest.guardianName) ?? undefined,
      guardianPhone: encryptOptional(rest.guardianPhone) ?? undefined,
    });
    await patientsRepository.createClinicalHistory(patient.id);
    return decryptPatient(patient);
  },

  async update(id, data) {
    const existing = await patientsRepository.findById(id);
    if (!existing) throw new NotFoundError("Paciente no encontrado");

    const { birthDate: birthDateStr, phone, address, guardianName, guardianPhone, ...rest } = data;
    const birthDate = parseBirthDate(birthDateStr);

    const updatePayload = {
      ...rest,
      birthDate,
      ...(phone !== undefined ? { phone: encrypt(phone) } : {}),
      ...("address" in data ? { address: encryptOptional(address) ?? undefined } : {}),
      ...("guardianName" in data ? { guardianName: encryptOptional(guardianName) ?? undefined } : {}),
      ...("guardianPhone" in data ? { guardianPhone: encryptOptional(guardianPhone) ?? undefined } : {}),
    };

    return decryptPatient(await patientsRepository.update(id, updatePayload));
  },

  async exportData(id) {
    const raw = await patientsRepository.findFullExport(id);
    if (!raw) throw new NotFoundError("Paciente no encontrado");

    const patient = decryptPatient(raw);

    return {
      patient: {
        ...patient,
        birthDate: patient.birthDate ? patient.birthDate.toISOString() : null,
      },
      appointments: raw.appointments.map((a) => ({
        id: a.id,
        date: a.date.toISOString(),
        doctor: a.doctor,
        procedure: a.procedure,
      })),
      clinicalHistory: raw.clinicalHistory
        ? {
            background: raw.clinicalHistory.background,
            notes: raw.clinicalHistory.notes.map((n) => ({
              type: n.type,
              content: n.content,
              createdAt: n.createdAt.toISOString(),
            })),
          }
        : null,
      cajaRecords: raw.cajaRecords.map((r) => ({
        id: r.id,
        description: r.description,
        total: r.total.toString(),
        balance: r.balance.toString(),
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        payments: r.payments.map((p) => ({
          amount: p.amount.toString(),
          method: p.method,
          createdAt: p.createdAt.toISOString(),
        })),
      })),
    };
  },

  async anonymize(id) {
    const existing = await patientsRepository.findById(id);
    if (!existing) throw new NotFoundError("Paciente no encontrado");

    await patientsRepository.anonymize(id, {
      firstName: "ANONIMIZADO",
      lastName: "ANONIMIZADO",
      idNumber: `ANON-${randomBytes(8).toString("hex")}`,
      phone: encrypt("0000000000"),
      email: null,
      birthDate: null,
      address: null,
      guardianName: null,
      guardianPhone: null,
      guardianRelation: null,
      habeaDataConsent: false,
    });
  },
};

export const patientsService = service;
