import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { sendWhatsappReminderFn } from "@/inngest/whatsapp-reminder";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendWhatsappReminderFn],
});
