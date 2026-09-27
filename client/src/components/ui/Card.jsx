export default function Card({ as: Tag = 'div', className = '', hover = false, children, ...rest }) {
  return (
    <Tag className={`card ${hover ? 'card-hover' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/** Section heading with an optional icon and right-hand action slot. */
export function CardHeader({ icon: Icon, title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-[--color-line] bg-[--color-surface-2]">
            <Icon className="size-4 text-berry-400" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[--color-ink]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-[--color-muted]">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Empty state for lists that have no data yet. */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {Icon && (
        <span className="grid size-12 place-items-center rounded-xl border border-[--color-line] bg-[--color-surface-2]">
          <Icon className="size-5 text-[--color-muted]" aria-hidden="true" />
        </span>
      )}
      <div>
        <p className="font-semibold text-[--color-ink]">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-sm text-[--color-muted]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
