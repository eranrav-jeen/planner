import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../lib/i18n';
import { navItems } from './nav';

export function Sidebar() {
  const { t } = useLanguage();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-e border-border bg-surface">
      <div className="flex items-center gap-2 px-5 py-5">
        <img src="/logo.svg" alt="Jeen" className="h-8 w-auto" />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-charcoal text-white'
                  : 'text-charcoal/80 hover:bg-bg hover:text-charcoal',
              )
            }
          >
            <item.icon className="h-4.5 w-4.5" size={18} strokeWidth={2} />
            <span>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 text-xs text-muted">Jeen.AI Planner v0.1</div>
    </aside>
  );
}
