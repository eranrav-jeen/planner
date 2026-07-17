import nodemailer from 'nodemailer';
import { env } from './env.js';

let transporter: nodemailer.Transporter | null = null;

export function isMailConfigured(): boolean {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
}

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

export async function sendMail(options: { to: string; subject: string; html: string; text?: string }) {
  if (!isMailConfigured()) {
    throw new Error('Email is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in the API environment.');
  }
  await getTransporter().sendMail({
    from: env.smtp.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}
