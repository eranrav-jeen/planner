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
};
