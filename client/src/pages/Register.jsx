import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, User, Mail, Lock, Check } from 'lucide-react';
import { useAuth } from '../context/authContext';
import Field from '../components/ui/Field';
import Alert from '../components/ui/Alert';
import { ButtonSpinner } from '../components/ui/Spinner';
import { AuthAside } from './Login';
import {
  validators,
  runValidation,
  mergeServerErrors,
  revalidateField,
  passwordStrength,
} from '../utils/validation';

const RULES = {
  name: validators.name,
  email: validators.email,
  password: validators.password,
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const strength = passwordStrength(values.password);

  const update = (field) => (e) => {
    const { value } = e.target;
    setValues((v) => ({ ...v, [field]: value }));
    setFormError('');
    // Only clear an existing error as the user types; never show a new one
    // before they have finished interacting with the field.
    if (errors[field]) revalidateField(field, value, RULES, setErrors);
  };

  const blur = (field) => () => revalidateField(field, values[field], RULES, setErrors);

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const found = runValidation(values, RULES);
    setErrors(found);
    if (Object.keys(found).length) {
      // Move focus to the first problem so keyboard users are not stranded.
      const first = document.querySelector('[aria-invalid="true"]');
      first?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrors(mergeServerErrors({}, err.errors));
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const requirements = [
    { label: 'At least 8 characters', met: values.password.length >= 8 },
    { label: 'Contains a letter', met: /[a-z]/i.test(values.password) },
    { label: 'Contains a number', met: /\d/.test(values.password) },
  ];

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <AuthAside />

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm animate-fade-up">
          <h1 className="text-2xl font-semibold">Create your account</h1>
          <p className="mt-1.5 text-sm text-[--color-muted]">
            Free to use. No card required.
          </p>

          {formError && (
            <Alert variant="error" message={formError} className="mt-5" onDismiss={() => setFormError('')} />
          )}

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <Field
              label="Full name"
              icon={User}
              autoComplete="name"
              placeholder="Jordan Patel"
              value={values.name}
              onChange={update('name')}
              onBlur={blur('name')}
              error={errors.name}
              disabled={submitting}
              required
            />
            <Field
              label="Email"
              type="email"
              icon={Mail}
              autoComplete="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={update('email')}
              onBlur={blur('email')}
              error={errors.email}
              disabled={submitting}
              required
            />
            <div>
              <Field
                label="Password"
                type="password"
                icon={Lock}
                autoComplete="new-password"
                placeholder="••••••••"
                value={values.password}
                onChange={update('password')}
                onBlur={blur('password')}
                error={errors.password}
                disabled={submitting}
                required
              />

              {values.password && !errors.password && (
                <div className="mt-2.5 space-y-2">
                  <div className="flex gap-1" aria-hidden="true">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-colors duration-300"
                        style={{
                          background:
                            i <= strength.score ? strength.color : 'var(--color-surface-3)',
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="text-xs font-medium" style={{ color: strength.color }}>
                      {strength.label}
                    </span>
                    <ul className="flex flex-wrap gap-x-3 gap-y-1">
                      {requirements.map((r) => (
                        <li
                          key={r.label}
                          className={`flex items-center gap-1 text-[11px] ${
                            r.met ? 'text-emerald-400' : 'text-[--color-muted]'
                          }`}
                        >
                          <Check className="size-3" aria-hidden="true" />
                          {r.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <ButtonSpinner /> Creating account…
                </>
              ) : (
                <>
                  Create account <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[--color-muted]">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-berry-400 hover:text-berry-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
