import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { sendWhatsappReminderFn } from "@/inngest/whatsapp-reminder";
import { weeklyBackupFn } from "@/inngest/weekly-backup";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendWhatsappReminderFn, weeklyBackupFn],
});
