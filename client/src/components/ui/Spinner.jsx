import { Loader2 } from 'lucide-react';

export function Spinner({ className = 'size-5' }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />;
}

/** Centred loader for route transitions and session restoration. */
export function FullPageSpinner({ label = 'Loading' }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3">
      <Spinner className="size-7 text-berry-400" />
      <p className="text-sm text-[--color-muted]">{label}…</p>
    </div>
  );
}

/** Inline loader for button labels, so the button keeps its width. */
export function ButtonSpinner() {
  return <Spinner className="size-4" />;
}
