import { db } from "@/lib/db";
import type { ClinicalHistory, ClinicalNote, OdontogramEntry, PatientFile } from "@prisma/client";
import type {
  CreateNoteInput,
  CreateOdontogramEntryInput,
  UpdateBackgroundInput,
} from "@/lib/validations/clinical-history.schema";

export type NoteWithDoctor = ClinicalNote & { doctor: { name: string } | null };

export type ClinicalHistoryFull = ClinicalHistory & {
  notes: NoteWithDoctor[];
  odontogram: OdontogramEntry[];
  files: PatientFile[];
};

interface ClinicalHistoryRepository {
  findByPatientId(patientId: string): Promise<ClinicalHistoryFull | null>;
  findNoteById(noteId: string): Promise<ClinicalNote | null>;
  updateBackground(id: string, data: UpdateBackgroundInput): Promise<ClinicalHistory>;
  addNote(clinicalHistoryId: string, data: CreateNoteInput & { doctorId: string }): Promise<NoteWithDoctor>;
  updateNote(noteId: string, content: string): Promise<NoteWithDoctor>;
  deleteNote(noteId: string): Promise<void>;
  upsertOdontogramEntry(
    clinicalHistoryId: string,
    data: CreateOdontogramEntryInput
  ): Promise<OdontogramEntry>;
  deleteOdontogramEntry(entryId: string): Promise<void>;
  addFile(
    clinicalHistoryId: string,
    data: { name: string; label?: string; url: string; mimeType: string }
  ): Promise<PatientFile>;
  deleteFile(fileId: string): Promise<void>;
}

const repo: ClinicalHistoryRepository = {
  findByPatientId(patientId) {
    return db.clinicalHistory.findUnique({
      where: { patientId },
      include: {
        notes: {
          orderBy: { createdAt: "desc" },
          include: { doctor: { select: { name: true } } },
        },
        odontogram: true,
        files: { orderBy: { createdAt: "desc" } },
      },
    });
  },

  findNoteById(noteId) {
    return db.clinicalNote.findUnique({ where: { id: noteId } });
  },

  updateBackground(id, data) {
    return db.clinicalHistory.update({ where: { id }, data });
  },

  addNote(clinicalHistoryId, data) {
    return db.clinicalNote.create({
      data: { clinicalHistoryId, ...data },
      include: { doctor: { select: { name: true } } },
    });
  },

  updateNote(noteId, content) {
    return db.clinicalNote.update({
      where: { id: noteId },
      data: { content },
      include: { doctor: { select: { name: true } } },
    });
  },

  async deleteNote(noteId) {
    await db.clinicalNote.delete({ where: { id: noteId } });
  },

  async upsertOdontogramEntry(clinicalHistoryId, data) {
    const existing = await db.odontogramEntry.findFirst({
      where: { clinicalHistoryId, toothNumber: data.toothNumber, surface: data.surface },
    });
    if (existing) {
      return db.odontogramEntry.update({
        where: { id: existing.id },
        data: { status: data.status, note: data.note },
      });
    }
    return db.odontogramEntry.create({ data: { clinicalHistoryId, ...data } });
  },

  async deleteOdontogramEntry(entryId) {
    await db.odontogramEntry.delete({ where: { id: entryId } });
  },

  addFile(clinicalHistoryId, data) {
    return db.patientFile.create({ data: { clinicalHistoryId, ...data } });
  },

  async deleteFile(fileId) {
    await db.patientFile.delete({ where: { id: fileId } });
  },
};

export const clinicalHistoryRepository = repo;
