/**
 * Email Notification System
 * Uses nodemailer for SMTP-based email sending.
 * SMTP settings are read from core_settings or environment variables.
 */

import { getSetting } from '@/lib/settings';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

async function getSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const host = await getSetting('smtp_host') ?? process.env.SMTP_HOST;
    const port = await getSetting('smtp_port') ?? process.env.SMTP_PORT ?? '587';
    const user = await getSetting('smtp_user') ?? process.env.SMTP_USER;
    const pass = await getSetting('smtp_pass') ?? process.env.SMTP_PASS;
    const from = await getSetting('smtp_from') ?? process.env.SMTP_FROM ?? 'noreply@ainova.hu';
    const secure = port === '465';

    if (!host || !user || !pass) return null;

    return { host, port: parseInt(port), secure, user, pass, from };
  } catch {
    return null;
  }
}

/**
 * Send an email using SMTP settings from DB or env.
 * Returns true if sent, false if SMTP is not configured or send failed.
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const config = await getSmtpConfig();
  if (!config) {
    console.warn('[Email] SMTP not configured, skipping email send');
    return false;
  }

  try {
    // Dynamic import — nodemailer is optional dependency
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });

    const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;

    await transporter.sendMail({
      from: config.from,
      to: recipients,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.log(`[Email] Sent to ${recipients}: ${options.subject}`);
    return true;
  } catch (err) {
    console.error('[Email] Send failed:', err);
    return false;
  }
}

/**
 * Send an alert email (templated).
 */
export async function sendAlertEmail(
  to: string | string[],
  alertTitle: string,
  alertMessage: string,
  moduleName?: string
): Promise<boolean> {
  const companyName = await getSetting('company_name') ?? 'Ainova Cloud Intelligence';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#f1f5f9;">
<div style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
  <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:24px 32px;color:white;">
    <h1 style="margin:0;font-size:20px;">${companyName}</h1>
    <p style="margin:4px 0 0;opacity:0.8;font-size:13px;">Rendszer értesítés</p>
  </div>
  <div style="padding:32px;">
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
      <h2 style="margin:0 0 8px;color:#92400e;font-size:16px;">⚠️ ${alertTitle}</h2>
      <p style="margin:0;color:#78350f;font-size:14px;">${alertMessage}</p>
    </div>
    ${moduleName ? `<p style="color:#64748b;font-size:13px;">Modul: <strong>${moduleName}</strong></p>` : ''}
    <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Ez egy automatikus értesítés az ${companyName} rendszerből.</p>
  </div>
</div>
</body>
</html>`;

  return sendEmail({
    to,
    subject: `[${companyName}] ${alertTitle}`,
    html,
    text: `${alertTitle}\n\n${alertMessage}`,
  });
}

/**
 * Send a report summary email.
 */
export async function sendReportEmail(
  to: string | string[],
  reportTitle: string,
  summaryHtml: string
): Promise<boolean> {
  const companyName = await getSetting('company_name') ?? 'Ainova Cloud Intelligence';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#f1f5f9;">
<div style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
  <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:24px 32px;color:white;">
    <h1 style="margin:0;font-size:20px;">${companyName}</h1>
    <p style="margin:4px 0 0;opacity:0.8;font-size:13px;">${reportTitle}</p>
  </div>
  <div style="padding:32px;">
    ${summaryHtml}
    <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Generálva: ${new Date().toLocaleString('hu-HU')}</p>
  </div>
</div>
</body>
</html>`;

  return sendEmail({
    to,
    subject: `[${companyName}] ${reportTitle}`,
    html,
  });
}
