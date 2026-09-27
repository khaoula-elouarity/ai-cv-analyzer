import { scoreTone, scoreColor } from '../../utils/scoreTheme';

const RADIUS = 84;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GRADIENT_ID = 'scoreCircleGradient';

/**
 * Animated circular progress gauge.
 *
 * Drawn with SVG stroke-dashoffset rather than a chart library: it is a few
 * lines, animates smoothly, and needs no extra dependency.
 */
export default function ScoreCircle({ score = 0, size = 200, label = 'Match score', sublabel }) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  const color = scoreColor(clamped);
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;
  const tone = scoreTone(clamped);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${clamped} out of 100 — ${tone.label}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          {/* One shared gradient; each instance picks its own stop colour. */}
          <linearGradient id={GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.65" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-surface-3)"
          strokeWidth={STROKE}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={RADIUS}
          fill="none"
          stroke={`url(#${GRADIENT_ID})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold tabular-nums leading-none"
          style={{ fontSize: size * 0.26, color }}
        >
          {clamped}
          <span className="text-[0.4em] align-super opacity-60">%</span>
        </span>
        <span className="mt-1.5 text-xs font-medium text-[--color-muted]">{label}</span>
        {sublabel && (
          <span className="mt-0.5 text-[11px] font-semibold" style={{ color }}>
            {tone.label}
          </span>
        )}
      </div>
    </div>
  );
}
