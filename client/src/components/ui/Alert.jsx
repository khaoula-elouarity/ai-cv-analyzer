import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';

const VARIANTS = {
  error: {
    icon: AlertCircle,
    ring: 'border-red-500/40 bg-red-500/10 text-red-200',
    iconColor: 'text-red-400',
  },
  success: {
    icon: CheckCircle2,
    ring: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    iconColor: 'text-emerald-400',
  },
  warning: {
    icon: AlertTriangle,
    ring: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    iconColor: 'text-amber-400',
  },
  info: {
    icon: Info,
    ring: 'border-berry-500/40 bg-berry-500/10 text-berry-200',
    iconColor: 'text-berry-400',
  },
};

/**
 * Dismissible inline alert. Used instead of window.alert so errors are
 * visible next to the thing that failed and remain on screen long enough
 * to be read.
 */
export default function Alert({ variant = 'error', title, message, onDismiss, className = '' }) {
  if (!message && !title) return null;
  const { icon: Icon, ring, iconColor } = VARIANTS[variant] || VARIANTS.error;

  return (
    <div
      // Errors interrupt; the other variants are polite background updates.
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${ring} ${className}`}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${iconColor}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {message && <p className={title ? 'mt-0.5 opacity-90' : 'opacity-90'}>{message}</p>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-md p-1 opacity-60 transition hover:bg-white/10 hover:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
