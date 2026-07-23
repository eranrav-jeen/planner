import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useLanguage } from '../lib/i18n';
import { useAuth, ApiRequestError } from '../lib/auth';
import { Button } from '../components/ui/button';

export function Login() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof ApiRequestError ? t('login.error') : t('common.somethingWrongGeneric'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-3">
          <img src="/logo.svg" alt="Jeen Solution OS" className="h-9 w-auto" />
          <div className="text-center">
            <h1 className="text-lg font-semibold text-charcoal">{t('login.title')}</h1>
            <p className="text-sm text-muted">{t('login.subtitle')}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal" htmlFor="email">
              {t('login.email')}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-charcoal"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal" htmlFor="password">
              {t('login.password')}
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-charcoal"
            />
          </div>
          {error && <p className="text-sm text-coral">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {t('login.submit')}
          </Button>
          <Link to="/forgot-password" className="block text-center text-sm text-muted hover:text-charcoal">
            {t('login.forgot')}
          </Link>
        </form>
      </div>
    </div>
  );
}
