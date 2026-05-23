import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { list } from "@vercel/blob";
import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";

function getS3Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getBucket() {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME not configured");
  return bucket;
}

async function uploadToR2(s3: S3Client, bucket: string, key: string, body: string) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "application/json",
    })
  );
}

export const weeklyBackupFn = inngest.createFunction(
  {
    id: "weekly-database-backup",
    triggers: [{ cron: "0 2 * * 0" }], // Sunday 02:00 UTC
  },
  async ({ step }) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const prefix = `backups/${timestamp}`;

    // ── Level 2: Prisma data export ──────────────────────────────────────────
    await step.run("export-database", async () => {
      const s3 = getS3Client();
      const bucket = getBucket();

      const [
        organizations,
        users,
        doctors,
        patients,
        appointments,
        cajaRecords,
        inventoryItems,
        auditLogs,
      ] = await Promise.all([
        db.organization.findMany(),
        db.user.findMany({ select: { id: true, email: true, name: true, role: true, active: true, organizationId: true, createdAt: true, updatedAt: true } }),
        db.doctor.findMany(),
        db.patient.findMany(),
        db.appointment.findMany(),
        db.cajaRecord.findMany({ include: { payments: true } }),
        db.inventoryItem.findMany(),
        db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10000 }),
      ]);

      const payload = JSON.stringify(
        { timestamp, organizations, users, doctors, patients, appointments, cajaRecords, inventoryItems, auditLogs },
        null,
        2
      );

      await uploadToR2(s3, bucket, `${prefix}/database.json`, payload);
      return { rows: patients.length };
    });

    // ── Level 3: Vercel Blob file list backup ────────────────────────────────
    await step.run("export-blob-index", async () => {
      const s3 = getS3Client();
      const bucket = getBucket();

      const blobs: { url: string; pathname: string; size: number; uploadedAt: Date }[] = [];
      let cursor: string | undefined;

      do {
        const result = await list({ cursor, limit: 1000 });
        blobs.push(...result.blobs);
        cursor = result.cursor;
      } while (cursor);

      await uploadToR2(
        s3,
        bucket,
        `${prefix}/blob-index.json`,
        JSON.stringify({ timestamp, count: blobs.length, blobs }, null, 2)
      );

      return { files: blobs.length };
    });

    return { ok: true, timestamp };
  }
);
