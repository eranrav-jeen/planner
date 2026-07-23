import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { getSetPasswordInfo, setPassword } from '../api/account';
import { ApiRequestError } from '../api/client';
import { useLanguage } from '../lib/i18n';
import { Button } from '../components/ui/button';

type State =
  | { kind: 'checking' }
  | { kind: 'invalid'; message: string }
  | { kind: 'form'; email: string; purpose: string }
  | { kind: 'done' };

export function SetPassword() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const [state, setState] = useState<State>({ kind: 'checking' });
  const [password, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState({ kind: 'invalid', message: t('setPassword.invalid') });
      return;
    }
    getSetPasswordInfo(token)
      .then((info) => setState({ kind: 'form', email: info.email, purpose: info.purpose }))
      .catch((err) =>
        setState({ kind: 'invalid', message: err instanceof ApiRequestError ? err.message : t('setPassword.invalid') }),
      );
  }, [token, t]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t('setPassword.tooShort'));
      return;
    }
    if (password !== confirm) {
      setError(t('setPassword.mismatch'));
      return;
    }
    setSubmitting(true);
    try {
      await setPassword(token, password);
      setState({ kind: 'done' });
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('common.somethingWrongGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-3">
          <img src="/logo.svg" alt="Jeen Solution OS" className="h-9 w-auto" />
        </div>

        {state.kind === 'checking' && <p className="text-center text-sm text-muted">{t('common.loading')}</p>}

        {state.kind === 'invalid' && (
          <div className="text-center">
            <p className="text-sm text-coral">{state.message}</p>
            <Link to="/forgot-password" className="mt-4 inline-block text-sm text-charcoal underline">
              {t('setPassword.requestNew')}
            </Link>
          </div>
        )}

        {state.kind === 'done' && (
          <div className="text-center">
            <h1 className="text-lg font-semibold text-charcoal">{t('setPassword.doneTitle')}</h1>
            <p className="mt-2 text-sm text-muted">{t('setPassword.doneBody')}</p>
            <Link to="/login" className="mt-4 inline-block text-sm text-charcoal underline">
              {t('setPassword.goToLogin')}
            </Link>
          </div>
        )}

        {state.kind === 'form' && (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-lg font-semibold text-charcoal">
                {state.purpose === 'reset' ? t('setPassword.resetTitle') : t('setPassword.inviteTitle')}
              </h1>
              <p className="text-sm text-muted">{state.email}</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-charcoal" htmlFor="pwd">
                  {t('setPassword.newPassword')}
                </label>
                <input
                  id="pwd"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPwd(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-charcoal"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-charcoal" htmlFor="confirm">
                  {t('setPassword.confirmPassword')}
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-charcoal"
                />
              </div>
              {error && <p className="text-sm text-coral">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {t('setPassword.submit')}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
