import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, FileSearch, Target } from 'lucide-react';
import { useAuth } from '../context/authContext';
import Field from '../components/ui/Field';
import Alert from '../components/ui/Alert';
import { ButtonSpinner } from '../components/ui/Spinner';
import { validators, runValidation, mergeServerErrors } from '../utils/validation';

const RULES = { email: validators.email, password: validators.loginPassword };

export default function Login() {
  const { login } = useAuth();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setFormError('');
  };

  const blur = (field) => () => {
    const message = RULES[field](values[field]);
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const found = runValidation(values, RULES);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      await login({ email: values.email.trim(), password: values.password });
      // The router's <Navigate> in the route guard handles redirection.
    } catch (err) {
      setErrors(mergeServerErrors({}, err.errors));
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <AuthAside />

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm animate-fade-up">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="mt-1.5 text-sm text-[--color-muted]">
            Sign in to analyse your CV and track your matches.
          </p>

          {formError && (
            <Alert variant="error" message={formError} className="mt-5" onDismiss={() => setFormError('')} />
          )}

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={update('email')}
              onBlur={blur('email')}
              error={errors.email}
              disabled={submitting}
              required
            />
            <Field
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={values.password}
              onChange={update('password')}
              onBlur={blur('password')}
              error={errors.password}
              disabled={submitting}
              required
            />

            <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <ButtonSpinner /> Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[--color-muted]">
            No account?{' '}
            <Link to="/register" className="font-semibold text-berry-400 hover:text-berry-300">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/** Marketing panel shown beside the auth forms on large screens. */
export function AuthAside() {
  const points = [
    { icon: FileSearch, title: 'Real CV parsing', body: 'Reads text out of PDF and Word files, not just filenames.' },
    { icon: Target, title: 'Job match scoring', body: 'See exactly which keywords you have and which are missing.' },
    { icon: ShieldCheck, title: 'Private by default', body: 'Your CV is analysed and stored under an httpOnly session.' },
  ];

  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-[--color-line] bg-[--color-surface-1] p-10 lg:flex">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-1/4 size-96 rounded-full bg-berry-600/20 blur-3xl"
      />
      <div className="relative">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-berry-600">
            <Sparkles className="size-4.5 text-white" />
          </span>
          <span className="font-semibold tracking-tight">CV Analyzer</span>
        </div>

        <h2 className="mt-14 max-w-sm text-3xl font-semibold leading-tight">
          Know exactly how your CV scores{' '}
          <span className="text-gradient">before recruiters see it</span>.
        </h2>
        <p className="mt-4 max-w-sm text-[--color-muted]">
          Upload once and get an explainable score, your extracted skills, the keywords you
          are missing, and the roles you are best suited to.
        </p>
      </div>

      <ul className="relative space-y-5">
        {points.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3.5">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-[--color-line] bg-[--color-surface-2]">
              <Icon className="size-4 text-berry-400" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-0.5 text-sm text-[--color-muted]">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
