import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  Users,
  CalendarRange,
  BarChart3,
  GanttChartSquare,
  ClipboardCheck,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { TranslationKey } from '../../lib/i18n';

export interface NavItem {
  to: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/customers', labelKey: 'nav.customers', icon: Building2 },
  { to: '/projects', labelKey: 'nav.projects', icon: FolderKanban },
  { to: '/employees', labelKey: 'nav.employees', icon: Users },
  { to: '/planning', labelKey: 'nav.planning', icon: CalendarRange },
  { to: '/reports', labelKey: 'nav.reports', icon: BarChart3 },
  { to: '/gantt', labelKey: 'nav.gantt', icon: GanttChartSquare },
  { to: '/actuals', labelKey: 'nav.actuals', icon: ClipboardCheck },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
];
