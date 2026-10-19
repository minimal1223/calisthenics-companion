import { useState } from 'react';
import { Check, Circle, CircleDashed, CircleDot } from 'lucide-react';
import type { AppData } from '../types';
import { PLAN_WEEKS, WEEKLY_STRENGTH_TARGET, phaseForWeek } from '../data/plan';
import { formatDate, planWeekRange } from '../utils/date';
import { summarizeWeek, weekStatus, WEEK_STATUS_LABEL, type WeekStatus } from '../utils/stats';

function StatusIcon({ status }: { status: WeekStatus }) {
  switch (status) {
    case 'target-met':
      return <Check size={16} strokeWidth={3} aria-hidden />;
    case 'current':
      return <CircleDot size={16} aria-hidden />;
    case 'some-activity':
      return <Circle size={10} fill="currentColor" aria-hidden />;
    case 'upcoming':
      return <CircleDashed size={16} aria-hidden />;
    default:
      return <Circle size={10} aria-hidden />;
  }
}

interface WeekProgressProps {
  data: AppData;
  currentWeek: number;
}

/** Twelve clickable plan weeks. Status is derived from recorded activity only. */
export function WeekProgress({ data, currentWeek }: WeekProgressProps) {
  const [selected, setSelected] = useState(currentWeek);
  const summaries = Array.from({ length: PLAN_WEEKS }, (_, i) => summarizeWeek(data, i + 1));
  const sel = summaries[selected - 1];
  const selStatus = weekStatus(sel, currentWeek);
  const phase = phaseForWeek(selected);
  const range = planWeekRange(selected, data.settings.planStartDate);

  return (
    <section className="card week-progress" aria-labelledby="week-progress-title">
      <div className="card__header">
        <h2 id="week-progress-title" className="card__title">12-week plan</h2>
        <p className="card__subtitle">Select a week to see its phase and what you logged.</p>
      </div>
      <ol className="week-grid">
        {summaries.map((s) => {
          const status = weekStatus(s, currentWeek);
          const isSelected = s.week === selected;
          return (
            <li key={s.week}>
              <button
                type="button"
                className={`week-chip week-chip--${status}${isSelected ? ' is-selected' : ''}${s.week === currentWeek ? ' is-current' : ''}`}
                aria-pressed={isSelected}
                aria-label={`Week ${s.week}: ${WEEK_STATUS_LABEL[status]}, ${s.strength.length} of ${WEEKLY_STRENGTH_TARGET} strength sessions${s.week === currentWeek ? ', current week' : ''}`}
                onClick={() => setSelected(s.week)}
              >
                <span className="week-chip__num num">{s.week}</span>
                <span className="week-chip__icon">
                  <StatusIcon status={status} />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <ul className="legend" aria-label="Legend">
        <li><span className="legend__swatch week-chip--target-met"><Check size={12} strokeWidth={3} aria-hidden /></span>Target met (3 strength)</li>
        <li><span className="legend__swatch week-chip--some-activity"><Circle size={8} fill="currentColor" aria-hidden /></span>Some activity</li>
        <li><span className="legend__swatch week-chip--current"><CircleDot size={12} aria-hidden /></span>Current</li>
        <li><span className="legend__swatch week-chip--upcoming"><CircleDashed size={12} aria-hidden /></span>Upcoming</li>
      </ul>

      <div className="week-detail" aria-live="polite">
        <div className="week-detail__head">
          <h3 className="week-detail__title">
            Week {selected} · {phase.name}
          </h3>
          <span className={`pill pill--${selStatus}`}>{WEEK_STATUS_LABEL[selStatus]}</span>
        </div>
        <p className="muted small">
          {formatDate(range.start)} – {formatDate(range.end)}
        </p>
        <p className="week-detail__goal">{phase.goal}</p>
        {selStatus === 'upcoming' ? (
          <p className="muted">This week hasn't started yet.</p>
        ) : (
          <dl className="week-detail__stats">
            <div>
              <dt>Strength</dt>
              <dd className="num">
                {sel.strength.length} / {WEEKLY_STRENGTH_TARGET}
              </dd>
            </div>
            <div>
              <dt>Minimum</dt>
              <dd className="num">{sel.minimum.length}</dd>
            </div>
            <div>
              <dt>Mobility</dt>
              <dd className="num">{sel.mobility.length}</dd>
            </div>
          </dl>
        )}
        {selStatus === 'no-activity' && (
          <p className="muted small">Nothing logged this week — that's okay. Every week is a fresh place to restart.</p>
        )}
      </div>
    </section>
  );
}
