if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build"
) {
  const required = [
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_TEMPLATE_NAME",
    "INNGEST_EVENT_KEY",
    "INNGEST_SIGNING_KEY",
  ];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Variable de entorno requerida no definida: ${key}`);
    }
  }
}
