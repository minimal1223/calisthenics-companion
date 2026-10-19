import type { ReactNode } from 'react';

interface ProgressCardProps {
  label: string;
  value: ReactNode;
  /** Optional suffix next to the value, e.g. "/ 3". */
  suffix?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  /** 0..1 — renders an accessible meter when provided. */
  progress?: number;
  progressLabel?: string;
}

export function ProgressCard({ label, value, suffix, hint, icon, progress, progressLabel }: ProgressCardProps) {
  const pct = progress === undefined ? null : Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <section className="card stat-card">
      <div className="stat-card__head">
        <h3 className="stat-card__label">{label}</h3>
        {icon && <span className="stat-card__icon" aria-hidden>{icon}</span>}
      </div>
      <p className="stat-card__value">
        <span className="num">{value}</span>
        {suffix && <span className="stat-card__suffix">{suffix}</span>}
      </p>
      {pct !== null && (
        <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={progressLabel ?? label}>
          <div className="meter__fill" style={{ width: `${pct}%` }} />
        </div>
      )}
      {hint && <p className="stat-card__hint">{hint}</p>}
    </section>
  );
}
