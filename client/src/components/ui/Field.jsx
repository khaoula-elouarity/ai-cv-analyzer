import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Labelled form field with inline validation messaging.
 * Wires up aria-invalid / aria-describedby so errors are announced to screen
 * readers rather than only being shown visually.
 */
export default function Field({
  label,
  error,
  hint,
  type = 'text',
  icon: Icon,
  className = '',
  containerClassName = '',
  ...inputProps
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const isPassword = type === 'password';
  // Visibility is local state, so each field toggles independently.
  const [revealed, setRevealed] = useState(false);
  const resolvedType = isPassword && revealed ? 'text' : type;

  return (
    <div className={containerClassName}>
      {label && (
        <label className="label" htmlFor={id}>
          {label}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[--color-muted]"
            aria-hidden="true"
          />
        )}
        <input
          id={id}
          type={resolvedType}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`field ${Icon ? 'pl-9' : ''} ${isPassword ? 'pr-10' : ''} ${
            error ? 'field-error' : ''
          } ${className}`}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[--color-muted] transition hover:bg-[--color-surface-2] hover:text-[--color-ink]"
          >
            {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>

      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-[--color-muted]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
