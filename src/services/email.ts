import { BrevoClient } from "@getbrevo/brevo";

const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY! });

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL!;

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const url = `${FRONTEND_URL}/verify-email?token=${token}`;

  await brevo.transactionalEmails.sendTransacEmail({
    sender: { name: "SnapClash", email: SENDER_EMAIL },
    to: [{ email }],
    subject: "Confirma tu cuenta en SnapClash 📸",
    htmlContent: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#7c3aed">¡Bienvenido a SnapClash!</h2>
        <p>Haz clic en el botón para confirmar tu cuenta:</p>
        <a href="${url}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#f59e0b;color:#130A21;font-weight:bold;border-radius:8px;text-decoration:none">
          Confirmar cuenta
        </a>
        <p style="color:#888;font-size:12px">Si no te has registrado en SnapClash, ignora este mensaje.</p>
      </div>
    `,
  });
}
