import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL ?? "DentApp <noreply@dentapp.com>";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export async function sendWelcomeDoctorEmail(
  to: string,
  name: string,
  tempPassword: string
): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Tu acceso a DentApp",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1d4ed8">Bienvenido a DentApp, ${name}</h2>
        <p>El administrador de tu consultorio te ha creado una cuenta. Puedes iniciar sesión con las siguientes credenciales:</p>
        <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0"><strong>Email:</strong> ${to}</p>
          <p style="margin:8px 0 0"><strong>Contraseña temporal:</strong> <code style="font-size:1.1em">${tempPassword}</code></p>
        </div>
        <p>Por seguridad, te recomendamos cambiar tu contraseña después de iniciar sesión por primera vez.</p>
        <a href="${APP_URL}/login" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#1d4ed8;color:#fff;border-radius:6px;text-decoration:none">Iniciar sesión</a>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Recuperar contraseña — DentApp",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1d4ed8">Recuperar contraseña</h2>
        <p>Hola ${name}, recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
        <p>Haz clic en el siguiente enlace para crear una nueva contraseña. <strong>El enlace expira en 1 hora.</strong></p>
        <a href="${resetUrl}" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#1d4ed8;color:#fff;border-radius:6px;text-decoration:none">Restablecer contraseña</a>
        <p style="margin-top:24px;color:#6b7280;font-size:0.85em">Si no solicitaste este cambio, ignora este correo. Tu contraseña no cambiará.</p>
      </div>
    `,
  });
}
