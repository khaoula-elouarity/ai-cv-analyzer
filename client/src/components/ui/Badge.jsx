const TONES = {
  berry: 'border-berry-500/40 bg-berry-500/12 text-berry-200',
  emerald: 'border-emerald-500/40 bg-emerald-500/12 text-emerald-200',
  amber: 'border-amber-500/40 bg-amber-500/12 text-amber-200',
  red: 'border-red-500/40 bg-red-500/12 text-red-200',
  slate: 'border-slate-500/40 bg-slate-500/12 text-slate-300',
  plum: 'border-plum-500/40 bg-plum-500/12 text-plum-200',
};

export default function Badge({ tone = 'slate', icon: Icon, children, className = '' }) {
  return (
    <span className={`badge ${TONES[tone] || TONES.slate} ${className}`}>
      {Icon && <Icon className="size-3" aria-hidden="true" />}
      {children}
    </span>
  );
}

const LEVEL_TONE = {
  Expert: 'emerald',
  Advanced: 'berry',
  Intermediate: 'amber',
  Beginner: 'slate',
};

export function LevelBadge({ level }) {
  return <Badge tone={LEVEL_TONE[level] || 'slate'}>{level}</Badge>;
}

const DEMAND_TONE = { High: 'emerald', Medium: 'amber', Steady: 'slate' };

export function DemandBadge({ demand }) {
  return <Badge tone={DEMAND_TONE[demand] || 'slate'}>{demand} demand</Badge>;
}
