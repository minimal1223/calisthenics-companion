import { useId, useState } from 'react';
import { Info } from 'lucide-react';
import type { TimerKind } from '../types';
import { useSharedTimer } from '../state/TimerContext';
import { useAppData } from '../state/AppDataContext';
import { TimerControlsBar, TimerFace } from '../components/Timer';
import { MAX_TIMER_SECONDS, MIN_TIMER_SECONDS } from '../hooks/useTimer';
import { formatClock } from '../utils/date';

const KINDS: { id: TimerKind; label: string }[] = [
  { id: 'exercise', label: 'Exercise interval' },
  { id: 'rest', label: 'Rest interval' },
  { id: 'mobility', label: 'Mobility hold' },
  { id: 'workout', label: 'Full workout' },
  { id: 'custom', label: 'Custom countdown' },
];
const PRESETS = [30, 45, 60, 90];
const WORKOUT_SECONDS = 20 * 60;

export function TimerPage() {
  const timer = useSharedTimer();
  const { data } = useAppData();
  const id = useId();
  const [kind, setKind] = useState<TimerKind>(timer.state.kind);
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [error, setError] = useState<string | null>(null);

  const labelFor = (k: TimerKind, secs: number) => {
    const name = KINDS.find((x) => x.id === k)?.label ?? 'Timer';
    return `${name} · ${formatClock(secs)}`;
  };

  /** Sets up a new countdown. While another one is active, the shared timer asks before replacing it. */
  const choose = (secs: number, k: TimerKind = kind) => {
    const config = { seconds: secs, label: labelFor(k, secs), kind: k, tag: 'timer-page' };
    if (timer.isActive) timer.requestStart(config);
    else timer.configure(config);
  };

  const applyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const m = minutes.trim() === '' ? 0 : Number(minutes);
    const s = seconds.trim() === '' ? 0 : Number(seconds);
    if (!Number.isInteger(m) || !Number.isInteger(s) || m < 0 || s < 0 || s > 59) {
      setError('Use whole numbers: minutes 0–60 and seconds 0–59.');
      return;
    }
    const total = m * 60 + s;
    if (total < MIN_TIMER_SECONDS || total > MAX_TIMER_SECONDS) {
      setError(`Choose between ${MIN_TIMER_SECONDS} seconds and ${MAX_TIMER_SECONDS / 60} minutes.`);
      return;
    }
    setError(null);
    choose(total);
  };

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">Timer</h1>
        <p className="page__lead">One timer for intervals, rest, holds, and full sessions. It keeps running while you move between screens.</p>
      </header>

      <div className="two-col two-col--timer">
        <section className="card timer-card" aria-label="Countdown">
          <TimerFace />
          <TimerControlsBar />
          {timer.state.status === 'completed' && (
            <p className="notice notice--success timer-card__done">Time's up — {timer.state.label}. Nice work.</p>
          )}
        </section>

        <div className="stack">
          <section className="card" aria-labelledby={`${id}-kind`}>
            <h2 id={`${id}-kind`} className="card__title">Purpose</h2>
            <div className="chip-group" role="radiogroup" aria-labelledby={`${id}-kind`}>
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  role="radio"
                  aria-checked={kind === k.id}
                  className={`chip${kind === k.id ? ' is-active' : ''}`}
                  onClick={() => {
                    setKind(k.id);
                    if (k.id === 'workout') choose(WORKOUT_SECONDS, 'workout');
                  }}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </section>

          <section className="card" aria-labelledby={`${id}-presets`}>
            <h2 id={`${id}-presets`} className="card__title">Presets</h2>
            <div className="preset-grid">
              {PRESETS.map((p) => (
                <button key={p} type="button" className="preset" onClick={() => choose(p)}>
                  <span className="num">{p}</span> s
                </button>
              ))}
              <button type="button" className="preset preset--wide" onClick={() => choose(WORKOUT_SECONDS, 'workout')}>
                <span className="num">20:00</span> full workout
              </button>
            </div>
          </section>

          <section className="card" aria-labelledby={`${id}-custom`}>
            <h2 id={`${id}-custom`} className="card__title">Custom duration</h2>
            <form className="custom-time" onSubmit={applyCustom} noValidate>
              <div className="field field--inline">
                <label htmlFor={`${id}-m`}>Minutes</label>
                <input id={`${id}-m`} type="number" inputMode="numeric" min={0} max={60} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="0" aria-invalid={Boolean(error)} aria-describedby={`${id}-err`} />
              </div>
              <div className="field field--inline">
                <label htmlFor={`${id}-s`}>Seconds</label>
                <input id={`${id}-s`} type="number" inputMode="numeric" min={0} max={59} value={seconds} onChange={(e) => setSeconds(e.target.value)} placeholder="30" aria-invalid={Boolean(error)} aria-describedby={`${id}-err`} />
              </div>
              <button type="submit" className="button button--secondary">
                Set timer
              </button>
            </form>
            <p id={`${id}-err`} className={error ? 'field__error' : 'field__hint'} role={error ? 'alert' : undefined}>
              {error ?? `Between ${MIN_TIMER_SECONDS} seconds and ${MAX_TIMER_SECONDS / 60} minutes.`}
            </p>
          </section>

          <p className="muted small timer-note">
            <Info size={14} aria-hidden /> {data.settings.soundEnabled ? 'A soft chime plays when time is up' : 'Sound is off'}; phones that support it also vibrate. The screen always shows when
            time is up. Browsers can't reliably alert you once this tab or app is closed.
          </p>
        </div>
      </div>
    </div>
  );
}
