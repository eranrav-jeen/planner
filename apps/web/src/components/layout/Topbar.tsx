import { Search, Globe, LogOut } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useLanguage } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';

export function Topbar() {
  const { t, language, setLanguage } = useLanguage();
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
      <div className="relative w-80 max-w-full">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          placeholder={t('topbar.search')}
          className="w-full rounded-lg border border-border bg-bg py-2 ps-9 pe-3 text-sm outline-none focus:border-charcoal"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-charcoal/80 hover:bg-bg"
          title={t('common.language')}
        >
          <Globe className="h-4 w-4" />
          {language === 'he' ? 'EN' : 'עב'}
        </button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium hover:bg-bg"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lavender text-xs font-semibold text-charcoal">
                {user?.email?.[0]?.toUpperCase() ?? '?'}
              </span>
              <span className="hidden sm:inline">{user?.email}</span>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="min-w-40 rounded-lg border border-border bg-surface p-1 shadow-card"
            >
              <DropdownMenu.Item
                onSelect={() => logout()}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none hover:bg-bg"
              >
                <LogOut className="h-4 w-4" />
                {t('topbar.logout')}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
