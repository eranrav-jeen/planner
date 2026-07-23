// Branded transactional emails for account setup. All styles are inline so they
// render in every mail client. The raw action URL (set-password / reset link) is
// composed by the caller.

function shell(opts: { heading: string; intro: string; buttonLabel: string; buttonUrl: string; footer: string }): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #232122;">
      <div style="background: #232122; padding: 24px 32px; border-radius: 8px 8px 0 0;">
        <span style="color: #fff; font-size: 18px; font-weight: 700;">Jeen Solution OS</span>
      </div>
      <div style="border: 1px solid #eee; border-top: none; padding: 32px; border-radius: 0 0 8px 8px;">
        <h1 style="font-size: 20px; margin: 0 0 12px;">${opts.heading}</h1>
        <p style="font-size: 14px; line-height: 1.6; color: #423e3d;">${opts.intro}</p>
        <div style="text-align: center; margin: 28px 0 8px;">
          <a href="${opts.buttonUrl}" style="background: #E45B4E; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">
            ${opts.buttonLabel}
          </a>
        </div>
        <p style="font-size: 12px; color: #8a8583; word-break: break-all; margin-top: 16px;">
          Or paste this link into your browser:<br />${opts.buttonUrl}
        </p>
        <p style="font-size: 12px; color: #8a8583; margin-top: 20px;">${opts.footer}</p>
      </div>
    </div>`;
}

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', MANAGER: 'Manager', VIEWER: 'Viewer' };

export function buildInviteEmail(user: { email: string; role: string }, setPasswordUrl: string) {
  const roleLabel = ROLE_LABEL[user.role] ?? user.role;
  const html = shell({
    heading: 'Welcome to Jeen Solution OS',
    intro: `An account has been created for you as <strong>${user.email}</strong> with <strong>${roleLabel}</strong> access. Click below to choose your password and sign in.`,
    buttonLabel: 'Set your password',
    buttonUrl: setPasswordUrl,
    footer: "This link expires in 7 days. If you weren't expecting this, you can ignore this email.",
  });
  const text = [
    'Welcome to Jeen Solution OS',
    `An account has been created for you as ${user.email} with ${roleLabel} access.`,
    'Set your password to sign in:',
    setPasswordUrl,
    '',
    "This link expires in 7 days. If you weren't expecting this, you can ignore this email.",
  ].join('\n');
  return { subject: 'Welcome to Jeen Solution OS — set your password', html, text };
}

export function buildResetEmail(user: { email: string }, resetUrl: string) {
  const html = shell({
    heading: 'Reset your password',
    intro: `We received a request to reset the password for <strong>${user.email}</strong>. Click below to choose a new one.`,
    buttonLabel: 'Reset password',
    buttonUrl: resetUrl,
    footer: "This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password won't change.",
  });
  const text = [
    'Reset your password',
    `We received a request to reset the password for ${user.email}.`,
    'Choose a new password:',
    resetUrl,
    '',
    "This link expires in 1 hour. If you didn't request this, ignore this email.",
  ].join('\n');
  return { subject: 'Reset your Jeen Solution OS password', html, text };
}
