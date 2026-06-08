import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/repositories/clinical-history.repository", () => ({
  clinicalHistoryRepository: {
    findByPatientId: vi.fn(),
    findNoteById: vi.fn(),
    findFileById: vi.fn(),
    updateBackground: vi.fn(),
    addNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    upsertOdontogramEntry: vi.fn(),
    deleteOdontogramEntry: vi.fn(),
    addFile: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

import { clinicalHistoryService } from "@/lib/services/clinical-history.service";
import { clinicalHistoryRepository } from "@/lib/repositories/clinical-history.repository";
import { NotFoundError } from "@/lib/errors";

const repo = vi.mocked(clinicalHistoryRepository);

const HISTORY_ID = "hist-1";
const PATIENT_ID = "patient-1";
const FILE_ID = "file-1";

const BASE_HISTORY = {
  id: HISTORY_ID,
  patientId: PATIENT_ID,
  background: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  notes: [],
  odontogram: [],
  files: [],
};

const BASE_FILE = {
  id: FILE_ID,
  clinicalHistoryId: HISTORY_ID,
  name: "rx.pdf",
  label: null,
  url: "https://blob.vercel-storage.com/rx.pdf",
  mimeType: "application/pdf",
  createdAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe("clinicalHistoryService.getFile", () => {
  it("returns the file when it belongs to the patient's history", async () => {
    repo.findByPatientId.mockResolvedValue(BASE_HISTORY);
    repo.findFileById.mockResolvedValue(BASE_FILE);

    const file = await clinicalHistoryService.getFile(PATIENT_ID, FILE_ID);

    expect(repo.findByPatientId).toHaveBeenCalledWith(PATIENT_ID);
    expect(repo.findFileById).toHaveBeenCalledWith(FILE_ID);
    expect(file).toEqual(BASE_FILE);
  });

  it("throws NotFoundError when the patient has no clinical history", async () => {
    repo.findByPatientId.mockResolvedValue(null);

    await expect(
      clinicalHistoryService.getFile(PATIENT_ID, FILE_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when the file does not exist", async () => {
    repo.findByPatientId.mockResolvedValue(BASE_HISTORY);
    repo.findFileById.mockResolvedValue(null);

    await expect(
      clinicalHistoryService.getFile(PATIENT_ID, FILE_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when the file belongs to a different patient's history", async () => {
    repo.findByPatientId.mockResolvedValue(BASE_HISTORY);
    repo.findFileById.mockResolvedValue({
      ...BASE_FILE,
      clinicalHistoryId: "other-hist-99",
    });

    await expect(
      clinicalHistoryService.getFile(PATIENT_ID, FILE_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
