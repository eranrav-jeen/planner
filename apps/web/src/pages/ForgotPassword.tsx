import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api/account';
import { useLanguage } from '../lib/i18n';
import { Button } from '../components/ui/button';

export function ForgotPassword() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
    } catch {
      // Intentionally ignore — the endpoint always succeeds to avoid leaking
      // which emails have accounts.
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-3">
          <img src="/logo.svg" alt="Jeen Solution OS" className="h-9 w-auto" />
          <h1 className="text-lg font-semibold text-charcoal">{t('forgotPassword.title')}</h1>
        </div>

        {sent ? (
          <div className="text-center">
            <p className="text-sm text-muted">{t('forgotPassword.sent')}</p>
            <Link to="/login" className="mt-4 inline-block text-sm text-charcoal underline">
              {t('forgotPassword.backToLogin')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted">{t('forgotPassword.intro')}</p>
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
            <Button type="submit" className="w-full" disabled={submitting}>
              {t('forgotPassword.submit')}
            </Button>
            <Link to="/login" className="block text-center text-sm text-muted hover:text-charcoal">
              {t('forgotPassword.backToLogin')}
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
