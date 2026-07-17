import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  defaultCurrency: process.env.DEFAULT_CURRENCY ?? 'ILS',
  planningWindowMonths: Number(process.env.PLANNING_WINDOW_MONTHS ?? 6),
  defaultMonthlyCapacityHours: Number(process.env.DEFAULT_MONTHLY_CAPACITY_HOURS ?? 186),
  isProduction: (process.env.NODE_ENV ?? 'development') === 'production',
  appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:5173',
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM ?? 'Jeen Solution OS <no-reply@jeen.ai>',
  },
};
