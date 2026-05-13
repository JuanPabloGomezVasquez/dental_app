import { AppError } from "@/lib/errors";

type ReminderPayload = {
  phone: string;
  appointment: {
    date: Date | string;
    doctor: { name: string };
    procedure: { name: string };
    patient: { firstName: string };
  };
};

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("57") && digits.length === 12) return digits;
  if (digits.length === 10) return `57${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `57${digits.slice(1)}`;
  return digits;
}

function formatColombianDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Bogota",
  }).format(d);
}

export async function sendWhatsappReminder(payload: ReminderPayload): Promise<void> {
  const phone = normalizePhone(payload.phone);
  const formattedDate = formatColombianDate(payload.appointment.date);

  if (process.env.NODE_ENV !== "production") {
    console.warn("[whatsapp] mock — payload:", {
      to: phone,
      patient: payload.appointment.patient.firstName,
      date: formattedDate,
      doctor: payload.appointment.doctor.name,
      procedure: payload.appointment.procedure.name,
    });
    return;
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;

  if (!accessToken || !phoneNumberId || !templateName) {
    throw new AppError(
      "Integración de WhatsApp no configurada. Configure WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_TEMPLATE_NAME.",
      500
    );
  }

  const body = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: templateName,
      language: { code: "es_CO" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: payload.appointment.patient.firstName },
            { type: "text", text: formattedDate },
            { type: "text", text: payload.appointment.doctor.name },
            { type: "text", text: payload.appointment.procedure.name },
          ],
        },
      ],
    },
  };

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const error = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new AppError(
      `WhatsApp API error: ${error.error?.message ?? res.statusText}`,
      502
    );
  }
}
