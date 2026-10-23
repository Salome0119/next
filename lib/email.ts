import { BrevoClient } from '@getbrevo/brevo';

const brevoClient = new BrevoClient({ apiKey: process.env.BREVO_API_KEY! });

const SENDER_EMAIL = process.env.SENDER_EMAIL!;
const SENDER_NAME = process.env.SENDER_NAME!;

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, htmlContent, textContent } = params;

  try {
    const response = await brevoClient.transactionalEmails.sendTransacEmail({
      sender: { email: SENDER_EMAIL, name: SENDER_NAME },
      to: [{ email: to }],
      subject,
      htmlContent,
      ...(textContent ? { textContent } : {}),
    });

    const messageId = (response as { data?: { messageId?: string } }).data?.messageId;
    console.log(`[EMAIL SENT] To: ${to} | Subject: ${subject} | MessageId: ${messageId}`);
    return { success: true, messageId };
  } catch (error) {
    const err = error as Error & { response?: { body?: { message?: string } } };
    const errorMessage = err.response?.body?.message || err.message || 'Error desconocido al enviar email';
    console.error(`[EMAIL ERROR] To: ${to} | Subject: ${subject} | Error: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

export async function sendInvitationEmail(
  to: string,
  workspaceName: string,
  role: 'admin' | 'member',
  inviteUrl: string
): Promise<SendEmailResult> {
  const subject = `Invitación a unirte a ${workspaceName} en PlanAI`;
  const roleLabel = role === 'admin' ? 'Administrador' : 'Miembro';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1e293b; border-radius: 12px; padding: 32px;">
        <h1 style="color: #3b82f6; margin: 0 0 16px; font-size: 24px;">📨 Invitación a PlanAI</h1>
        <p style="color: #e2e8f0; margin: 0 0 24px; font-size: 16px;">Has sido invitado a unirte al workspace <strong>${workspaceName}</strong> en <strong>PlanAI</strong>.</p>
        <p style="color: #94a3b8; margin: 0 0 24px; font-size: 14px;">Rol: <strong style="color: #e2e8f0;">${roleLabel}</strong></p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${inviteUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Aceptar invitación</a>
        </div>
        <p style="color: #64748b; font-size: 13px; margin: 0;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
        <p style="color: #3b82f6; font-size: 13px; word-break: break-all; margin: 8px 0 0;">${inviteUrl}</p>
        <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;">
        <p style="color: #64748b; font-size: 12px; margin: 0;">Esta invitación expira en 7 días. Si no esperabas esta invitación, puedes ignorar este correo.</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    Invitación a PlanAI
    
    Has sido invitado a unirte al workspace "${workspaceName}" en PlanAI.
    Rol: ${roleLabel}
    
    Para aceptar la invitación, visita: ${inviteUrl}
    
    Esta invitación expira en 7 días. Si no esperabas esta invitación, puedes ignorar este correo.
  `;

  return sendEmail({ to, subject, htmlContent, textContent });
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  userName?: string
): Promise<SendEmailResult> {
  const subject = 'Restablece tu contraseña en PlanAI';
  const displayName = userName || 'Usuario';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1e293b; border-radius: 12px; padding: 32px;">
        <h1 style="color: #3b82f6; margin: 0 0 16px; font-size: 24px;">🔐 Restablecer contraseña</h1>
        <p style="color: #e2e8f0; margin: 0 0 24px; font-size: 16px;">Hola <strong>${displayName}</strong>,</p>
        <p style="color: #94a3b8; margin: 0 0 24px; font-size: 14px;">Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>PlanAI</strong>.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Restablecer contraseña</a>
        </div>
        <p style="color: #64748b; font-size: 13px; margin: 0;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
        <p style="color: #3b82f6; font-size: 13px; word-break: break-all; margin: 8px 0 0;">${resetUrl}</p>
        <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;">
        <p style="color: #ef4444; font-size: 13px; margin: 0 0 8px;"><strong>Importante:</strong> Este enlace expira en 30 minutos.</p>
        <p style="color: #64748b; font-size: 12px; margin: 0;">Si no solicitaste restablecer tu contraseña, puedes ignorar este correo. Tu cuenta permanecerá segura.</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    Restablecer contraseña - PlanAI
    
    Hola ${displayName},
    
    Recibimos una solicitud para restablecer la contraseña de tu cuenta en PlanAI.
    
    Para restablecer tu contraseña, visita: ${resetUrl}
    
    Importante: Este enlace expira en 30 minutos.
    
    Si no solicitaste restablecer tu contraseña, puedes ignorar este correo. Tu cuenta permanecerá segura.
  `;

  return sendEmail({ to, subject, htmlContent, textContent });
}