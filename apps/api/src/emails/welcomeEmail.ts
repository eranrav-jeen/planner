import { env } from '../lib/env.js';

const GUIDELINES: { title: string; body: string }[] = [
  {
    title: 'Planning grid',
    body: 'Go to Planning to set each employee’s monthly allocation (in hours) against a project. Totals and remaining capacity update live.',
  },
  {
    title: 'Projects & customers',
    body: 'Projects live under a customer and track dates, status, and purchase orders. Use the Projects page to create or update them.',
  },
  {
    title: 'Reports',
    body: 'Reports covers utilization, capacity vs. demand, burn, profitability, portfolio and forecast views — filter by date range or project.',
  },
  {
    title: 'Gantt',
    body: 'The Gantt page gives a timeline view across projects so you can spot overlaps and upcoming milestones at a glance.',
  },
  {
    title: 'Exports',
    body: 'Most report and planning views can be exported to Excel or PDF using the Export button in the page header.',
  },
];

export function buildWelcomeEmail(user: { email: string; role: string }) {
  const loginUrl = env.appBaseUrl;
  const roleLabel = user.role.charAt(0) + user.role.slice(1).toLowerCase();

  const guidelinesHtml = GUIDELINES.map(
    (g) => `
      <tr>
        <td style="padding: 10px 0; border-top: 1px solid #eee;">
          <p style="margin: 0 0 4px; font-weight: 600; color: #232122; font-size: 14px;">${g.title}</p>
          <p style="margin: 0; color: #55504f; font-size: 13px; line-height: 1.5;">${g.body}</p>
        </td>
      </tr>`,
  ).join('');

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #232122;">
      <div style="background: #232122; padding: 24px 32px; border-radius: 8px 8px 0 0;">
        <span style="color: #fff; font-size: 18px; font-weight: 700;">Jeen Solution OS</span>
      </div>
      <div style="border: 1px solid #eee; border-top: none; padding: 32px; border-radius: 0 0 8px 8px;">
        <h1 style="font-size: 20px; margin: 0 0 12px;">Welcome to Jeen Solution OS</h1>
        <p style="font-size: 14px; line-height: 1.6; color: #423e3d;">
          An account has been created for you as <strong>${user.email}</strong> with <strong>${roleLabel}</strong> access.
          Here's a quick guide to get you started:
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">${guidelinesHtml}</table>
        <div style="text-align: center; margin: 28px 0 8px;">
          <a href="${loginUrl}" style="background: #E45B4E; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">
            Open Jeen Solution OS
          </a>
        </div>
        <p style="font-size: 12px; color: #8a8583; text-align: center; margin-top: 24px;">
          If you weren't expecting this email, you can ignore it.
        </p>
      </div>
    </div>`;

  const text = [
    'Welcome to Jeen Solution OS',
    `An account has been created for you as ${user.email} with ${roleLabel} access.`,
    '',
    ...GUIDELINES.flatMap((g) => [g.title, g.body, '']),
    `Open the app: ${loginUrl}`,
  ].join('\n');

  return { subject: 'Welcome to Jeen Solution OS', html, text };
}
