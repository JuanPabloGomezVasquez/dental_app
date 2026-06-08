import { inngest } from "./client";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { sendWhatsappReminder } from "@/lib/integrations/whatsapp/client";

export const sendWhatsappReminderFn = inngest.createFunction(
  {
    id: "send-whatsapp-reminder",
    triggers: [{ event: "dental/appointment.created" }],
    cancelOn: [
      {
        event: "dental/appointment.cancelled",
        match: "data.appointmentId",
      },
    ],
  },
  async ({ event, step }) => {
    const { appointmentId, appointmentDate } = event.data as {
      appointmentId: string;
      appointmentDate: string;
    };

    const appointmentMs = new Date(appointmentDate).getTime();
    if (isNaN(appointmentMs)) {
      return { skipped: true, reason: "invalid_appointment_date" };
    }
    const reminderTime = new Date(appointmentMs - 24 * 60 * 60 * 1000);
    await step.sleepUntil("wait-until-reminder-time", reminderTime);

    const appointment = await step.run("fetch-appointment", async () => {
      return db.appointment.findUnique({
        where: { id: appointmentId },
        include: { patient: true, doctor: true, procedure: true },
      });
    });

    if (!appointment) return { skipped: true, reason: "appointment_not_found" };

    await step.run("send-reminder", async () => {
      const phone = decrypt(appointment.patient.phone);
      await sendWhatsappReminder({
        phone,
        appointment: {
          date: appointment.date,
          doctor: { name: appointment.doctor.name },
          procedure: { name: appointment.procedure.name },
          patient: { firstName: appointment.patient.firstName },
        },
      });
    });

    return { sent: true, appointmentId };
  }
);
