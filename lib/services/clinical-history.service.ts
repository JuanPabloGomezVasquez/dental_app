import type { OdontogramEntry, PatientFile } from "@prisma/client";
import { clinicalHistoryRepository } from "@/lib/repositories/clinical-history.repository";
import type { ClinicalHistoryFull, NoteWithDoctor } from "@/lib/repositories/clinical-history.repository";
import type {
  CreateNoteInput,
  CreateOdontogramEntryInput,
  UpdateBackgroundInput,
} from "@/lib/validations/clinical-history.schema";
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors";

const VALID_TOOTH_NUMBERS = new Set([
  ...Array.from({ length: 8 }, (_, i) => 11 + i),
  ...Array.from({ length: 8 }, (_, i) => 21 + i),
  ...Array.from({ length: 8 }, (_, i) => 31 + i),
  ...Array.from({ length: 8 }, (_, i) => 41 + i),
]);

interface ClinicalHistoryService {
  getByPatientId(patientId: string): Promise<ClinicalHistoryFull>;
  updateBackground(patientId: string, data: UpdateBackgroundInput): Promise<void>;
  addNote(patientId: string, data: CreateNoteInput & { doctorId: string }): Promise<NoteWithDoctor>;
  updateNote(patientId: string, noteId: string, content: string, callerDoctorId: string | null): Promise<NoteWithDoctor>;
  deleteNote(patientId: string, noteId: string, callerRole: string, callerDoctorId: string | null): Promise<void>;
  upsertOdontogramEntry(
    patientId: string,
    data: CreateOdontogramEntryInput
  ): Promise<OdontogramEntry>;
  resetOdontogramEntry(patientId: string, entryId: string): Promise<void>;
  addFile(
    patientId: string,
    fileData: { name: string; label?: string; url: string; mimeType: string }
  ): Promise<PatientFile>;
  deleteFile(patientId: string, fileId: string): Promise<void>;
  getFile(patientId: string, fileId: string): Promise<PatientFile>;
}

async function getHistory(patientId: string): Promise<ClinicalHistoryFull> {
  const history = await clinicalHistoryRepository.findByPatientId(patientId);
  if (!history) throw new NotFoundError("Historia clínica no encontrada");
  return history;
}

function assertValidToothNumber(toothNumber: number): void {
  if (!VALID_TOOTH_NUMBERS.has(toothNumber)) {
    throw new ValidationError(`Número de pieza inválido: ${toothNumber}`);
  }
}

const service: ClinicalHistoryService = {
  getByPatientId(patientId) {
    return getHistory(patientId);
  },

  async updateBackground(patientId, data) {
    const history = await getHistory(patientId);
    await clinicalHistoryRepository.updateBackground(history.id, data);
  },

  async addNote(patientId, data) {
    const history = await getHistory(patientId);
    return clinicalHistoryRepository.addNote(history.id, data);
  },

  async updateNote(patientId, noteId, content, callerDoctorId) {
    await getHistory(patientId);
    const note = await clinicalHistoryRepository.findNoteById(noteId);
    if (!note) throw new NotFoundError("Nota no encontrada");
    if (note.doctorId !== callerDoctorId) {
      throw new ForbiddenError("Solo puedes editar tus propias notas");
    }
    return clinicalHistoryRepository.updateNote(noteId, content);
  },

  async deleteNote(patientId, noteId, callerRole, callerDoctorId) {
    await getHistory(patientId);
    const note = await clinicalHistoryRepository.findNoteById(noteId);
    if (!note) throw new NotFoundError("Nota no encontrada");
    const isAdmin = callerRole === "ADMIN" || callerRole === "SUPER_ADMIN";
    if (!isAdmin && note.doctorId !== callerDoctorId) {
      throw new ForbiddenError("Solo puedes eliminar tus propias notas");
    }
    await clinicalHistoryRepository.deleteNote(noteId);
  },

  async upsertOdontogramEntry(patientId, data) {
    assertValidToothNumber(data.toothNumber);
    const history = await getHistory(patientId);
    return clinicalHistoryRepository.upsertOdontogramEntry(history.id, data);
  },

  async resetOdontogramEntry(patientId, entryId) {
    await getHistory(patientId);
    await clinicalHistoryRepository.deleteOdontogramEntry(entryId);
  },

  async addFile(patientId, fileData) {
    const history = await getHistory(patientId);
    return clinicalHistoryRepository.addFile(history.id, fileData);
  },

  async deleteFile(patientId, fileId) {
    await getHistory(patientId);
    await clinicalHistoryRepository.deleteFile(fileId);
  },

  async getFile(patientId, fileId) {
    const history = await getHistory(patientId);
    const file = await clinicalHistoryRepository.findFileById(fileId);
    if (!file || file.clinicalHistoryId !== history.id) {
      throw new NotFoundError("Archivo no encontrado");
    }
    return file;
  },
};

export const clinicalHistoryService = service;
