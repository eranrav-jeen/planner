import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../../lib/format';
import { monthShortLabel } from '../../lib/months';
import type { Language } from '../../lib/i18n';

interface RevenueChartProps {
  data: { month: string; revenue: number }[];
  language: Language;
  currency?: string;
}

function ChartTooltip({ active, payload, language, currency }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as { month: string; revenue: number };
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-card">
      <div className="font-medium text-charcoal">{monthShortLabel(point.month, language)}</div>
      <div className="tabular-nums text-muted">{formatCurrency(point.revenue, currency)}</div>
    </div>
  );
}

export function RevenueChart({ data, language, currency = 'ILS' }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#E7E5E4" strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickFormatter={(m) => monthShortLabel(m, language)}
          tick={{ fontSize: 12, fill: '#6B7280' }}
          axisLine={{ stroke: '#E7E5E4' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(v, currency)}
          tick={{ fontSize: 11, fill: '#6B7280' }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip content={<ChartTooltip language={language} currency={currency} />} cursor={{ fill: '#23212208' }} />
        <Bar dataKey="revenue" fill="#232122" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
