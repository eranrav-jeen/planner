import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Language = 'he' | 'en';

const dictionaries = {
  he: {
    'nav.dashboard': 'לוח בקרה',
    'nav.customers': 'לקוחות',
    'nav.projects': 'פרויקטים',
    'nav.employees': 'עובדים',
    'nav.planning': 'תכנון',
    'nav.reports': 'דוחות',
    'nav.gantt': 'ציר זמן',
    'nav.settings': 'הגדרות',
    'topbar.search': 'חיפוש...',
    'topbar.logout': 'התנתקות',
    'login.title': 'כניסה למערכת',
    'login.subtitle': 'תכנון פרויקטים של Jeen.AI',
    'login.email': 'אימייל',
    'login.password': 'סיסמה',
    'login.submit': 'כניסה',
    'login.error': 'אימייל או סיסמה שגויים',
    'common.loading': 'טוען...',
    'common.language': 'שפה',
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.customers': 'Customers',
    'nav.projects': 'Projects',
    'nav.employees': 'Employees',
    'nav.planning': 'Planning',
    'nav.reports': 'Reports',
    'nav.gantt': 'Gantt',
    'nav.settings': 'Settings',
    'topbar.search': 'Search...',
    'topbar.logout': 'Log out',
    'login.title': 'Sign in',
    'login.subtitle': 'Jeen.AI Project Planner',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.submit': 'Sign in',
    'login.error': 'Invalid email or password',
    'common.loading': 'Loading...',
    'common.language': 'Language',
  },
} as const;

export type TranslationKey = keyof (typeof dictionaries)['en'];

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  dir: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'jeen-language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'en' || stored === 'he' ? stored : 'he';
  });

  const dir = language === 'he' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    localStorage.setItem(STORAGE_KEY, language);
  }, [dir, language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      dir,
      t: (key: TranslationKey) => dictionaries[language][key] ?? key,
    }),
    [language, dir],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
