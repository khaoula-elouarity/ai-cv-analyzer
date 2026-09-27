import { scoreColor } from '../../utils/scoreTheme';

/** Horizontal bar used for the score breakdown and per-category readiness. */
export default function ScoreBar({ label, value = 0, hint, animate = true }) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const color = scoreColor(clamped);

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-[--color-ink]">{label}</span>
        <span className="text-sm font-semibold tabular-nums" style={{ color }}>
          {clamped}%
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-[--color-surface-3]"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${clamped}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            transition: animate ? 'width 0.9s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
          }}
        />
      </div>
      {hint && <p className="mt-1 text-xs text-[--color-muted]">{hint}</p>}
    </div>
  );
}
