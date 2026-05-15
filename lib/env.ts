if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build"
) {
  const optional = [
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_TEMPLATE_NAME",
    "INNGEST_EVENT_KEY",
    "INNGEST_SIGNING_KEY",
  ];
  for (const key of optional) {
    if (!process.env[key]) {
      console.warn(`[env] Variable de entorno no definida (integración desactivada): ${key}`);
    }
  }
}
