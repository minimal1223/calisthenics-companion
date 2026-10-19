import { useId, useState } from 'react';
import { Award, ClipboardList, Clock, Dumbbell, Flame, Footprints, HeartHandshake, Pencil, Target, Trash2, TrendingUp } from 'lucide-react';
import type { MobilitySession, PageId, WorkoutSession } from '../types';
import { useAppData } from '../state/AppDataContext';
import { useToast } from '../state/ToastContext';
import { usePlan } from '../hooks/usePlan';
import { ProgressCard } from '../components/ProgressCard';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RECOMMENDED_CHECKIN_WEEKS, WEEKLY_STRENGTH_TARGET } from '../data/plan';
import { exerciseName, WORKOUTS } from '../data/workouts';
import { MOBILITY_ROUTINES, movementName } from '../data/mobility';
import {
  activeStreak,
  activityDates,
  compareSessionsDesc,
  isMinimumSession,
  isStrengthSession,
  personalRecords,
  summarizeWeek,
  totalTrainingSeconds,
} from '../utils/stats';
import { formatDate, formatDuration, isValidLocalDate, planWeekOf, today } from '../utils/date';

interface ProgressProps {
  navigate: (page: PageId, sub?: string | null) => void;
}

export function Progress({ navigate }: ProgressProps) {
  const { data } = useAppData();
  const { todayDate, currentWeek, beforeStart } = usePlan();
  const strength = data.workoutSessions.filter(isStrengthSession);
  const minimum = data.workoutSessions.filter(isMinimumSession);
  const mobility = data.mobilitySessions.filter((s) => s.completed);
  const streak = activeStreak(activityDates(data), todayDate);
  const thisWeek = summarizeWeek(data, currentWeek);

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">Progress</h1>
        <p className="page__lead">Everything here comes from what you've actually logged on this device.</p>
      </header>

      <div className="stats-grid stats-grid--six">
        <ProgressCard label="Strength sessions" value={strength.length} icon={<Dumbbell size={18} />} />
        <ProgressCard label="Mobility sessions" value={mobility.length} icon={<Footprints size={18} />} />
        <ProgressCard label="Minimum sessions" value={minimum.length} icon={<HeartHandshake size={18} />} />
        <ProgressCard label="Training time" value={formatDuration(totalTrainingSeconds(data))} icon={<Clock size={18} />} hint="Sum of logged session durations." />
        <ProgressCard
          label="This week"
          value={thisWeek.strength.length}
          suffix={`/ ${WEEKLY_STRENGTH_TARGET}`}
          icon={<Target size={18} />}
          progress={thisWeek.strength.length / WEEKLY_STRENGTH_TARGET}
          hint={beforeStart ? 'Plan not started yet.' : `Strength sessions in plan week ${currentWeek}.`}
        />
        <ProgressCard label="Active streak" value={streak.days} suffix={streak.days === 1 ? 'day' : 'days'} icon={<Flame size={18} />} hint="Consecutive days with any logged activity." />
      </div>

      <div className="two-col">
        <WeeklyChart currentWeek={currentWeek} />
        <PersonalRecords />
      </div>

      <Checkins currentWeek={currentWeek} />
      <History navigate={navigate} />
    </div>
  );
}

function WeeklyChart({ currentWeek }: { currentWeek: number }) {
  const { data } = useAppData();
  const first = Math.max(1, currentWeek - 5);
  const weeks = Array.from({ length: currentWeek - first + 1 }, (_, i) => summarizeWeek(data, first + i));
  const max = Math.max(WEEKLY_STRENGTH_TARGET + 1, ...weeks.map((w) => w.strength.length));
  const description = weeks.map((w) => `Week ${w.week}: ${w.strength.length}`).join('; ');

  return (
    <section className="card" aria-labelledby="chart-title">
      <div className="card__header">
        <h2 id="chart-title" className="card__title">
          <TrendingUp size={18} aria-hidden /> Strength sessions per week
        </h2>
        <p className="card__subtitle">Current and previous plan weeks. The dashed line is the target of {WEEKLY_STRENGTH_TARGET}.</p>
      </div>
      <div className="chart" role="img" aria-label={`Bar chart of strength sessions per plan week. ${description}. Target ${WEEKLY_STRENGTH_TARGET} per week.`}>
        {/* Bar area = chart height minus 24px top padding and 24px for the week label below. */}
        <div className="chart__target" style={{ bottom: `calc(24px + (100% - 48px) * ${WEEKLY_STRENGTH_TARGET / max})` }} aria-hidden>
          <span>Target {WEEKLY_STRENGTH_TARGET}</span>
        </div>
        {weeks.map((w) => (
          <div key={w.week} className="chart__col" aria-hidden>
            <div className="chart__bar-wrap">
              <div className={`chart__bar${w.strength.length >= WEEKLY_STRENGTH_TARGET ? ' is-met' : ''}${w.week === currentWeek ? ' is-current' : ''}`} style={{ height: `${(w.strength.length / max) * 100}%` }}>
                <span className="chart__value num">{w.strength.length}</span>
              </div>
            </div>
            <span className="chart__label">W{w.week}</span>
          </div>
        ))}
      </div>
      <table className="visually-hidden">
        <caption>Strength sessions per plan week</caption>
        <thead>
          <tr>
            <th scope="col">Week</th>
            <th scope="col">Strength sessions</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.week}>
              <td>{w.week}</td>
              <td>{w.strength.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {weeks.every((w) => w.strength.length === 0) && <p className="muted small">No strength sessions logged in these weeks yet. Your first session starts the story.</p>}
    </section>
  );
}

function PersonalRecords() {
  const { data } = useAppData();
  const records = personalRecords(data.workoutSessions);
  const bestCheckin = data.checkins.reduce<number | null>((best, c) => (best === null || c.pushupCount > best ? c.pushupCount : best), null);
  const order = [...WORKOUTS.A.exercises, ...WORKOUTS.B.exercises].map((e) => e.id);
  records.sort((a, b) => order.indexOf(a.exerciseId) - order.indexOf(b.exerciseId));

  return (
    <section className="card" aria-labelledby="records-title">
      <div className="card__header">
        <h2 id="records-title" className="card__title">
          <Award size={18} aria-hidden /> Personal records
        </h2>
        <p className="card__subtitle">Best single set from your logged workouts. Compare only like-for-like variations.</p>
      </div>
      {records.length === 0 && bestCheckin === null ? (
        <EmptyState icon={<Award size={28} />} title="No records yet">
          <p>Enter reps while you train and your best sets will appear here.</p>
        </EmptyState>
      ) : (
        <ul className="records">
          {bestCheckin !== null && (
            <li>
              <span>Push-up check-in</span>
              <span className="num records__value">{bestCheckin} reps</span>
            </li>
          )}
          {records.map((r) => (
            <li key={r.exerciseId}>
              <span>
                {exerciseName(r.exerciseId)} <span className="muted small">· {formatDate(r.date)}</span>
              </span>
              <span className="num records__value">
                {r.bestSet} {r.unit === 'seconds' ? 's' : 'reps'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Checkins({ currentWeek }: { currentWeek: number }) {
  const { data, addCheckin, deleteCheckin, updateSettings } = useAppData();
  const { notify } = useToast();
  const id = useId();
  const [date, setDate] = useState(today());
  const [pushups, setPushups] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [editingBaseline, setEditingBaseline] = useState(false);
  const [baselineInput, setBaselineInput] = useState(String(data.settings.pushupBaseline ?? ''));
  const [baselineError, setBaselineError] = useState<string | null>(null);

  const checkins = [...data.checkins].sort(compareSessionsDesc);
  const start = data.settings.planStartDate;
  const weeksWithCheckin = new Set(data.checkins.map((c) => planWeekOf(c.date, start)));
  const latest = checkins[0];
  const baseline = data.settings.pushupBaseline;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!isValidLocalDate(date)) next.date = 'Choose a valid date.';
    else if (date > today()) next.date = 'The date cannot be in the future.';
    const p = Number(pushups);
    if (pushups.trim() === '' || !Number.isInteger(p) || p < 0 || p > 500) next.pushups = 'Enter a whole number from 0 to 500.';
    let w: number | null = null;
    if (weight.trim() !== '') {
      w = Number(weight);
      if (!Number.isFinite(w) || w < 20 || w > 400) next.weight = 'Enter a weight between 20 and 400 kg, or leave it blank.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    addCheckin({ date, pushupCount: p, bodyWeightKg: w === null ? null : Math.round(w * 10) / 10, notes });
    setPushups('');
    setWeight('');
    setNotes('');
    notify('Check-in saved.');
  };

  const saveBaseline = () => {
    const trimmed = baselineInput.trim();
    const n = Number(trimmed);
    if (trimmed !== '' && (!Number.isInteger(n) || n < 0 || n > 500)) {
      setBaselineError('Enter a whole number from 0 to 500, or leave blank.');
      return;
    }
    updateSettings({ pushupBaseline: trimmed === '' ? null : n });
    setBaselineError(null);
    setEditingBaseline(false);
    notify('Baseline updated.');
  };

  return (
    <section className="card" aria-labelledby="checkins-title">
      <div className="card__header">
        <h2 id="checkins-title" className="card__title">
          <ClipboardList size={18} aria-hidden /> Strength check-ins
        </h2>
        <p className="card__subtitle">
          Controlled push-up reps with good form — not a max-effort test. Comparisons are only meaningful with the same technique and variation (e.g. floor vs. incline).
        </p>
      </div>

      <div className="checkin-meta">
        <div className="checkin-baseline">
          <p className="small muted">Self-reported starting point</p>
          {editingBaseline ? (
            <div className="inline-edit">
              <label htmlFor={`${id}-baseline`} className="visually-hidden">
                Push-up baseline
              </label>
              <input id={`${id}-baseline`} type="number" inputMode="numeric" min={0} max={500} value={baselineInput} onChange={(e) => setBaselineInput(e.target.value)} aria-invalid={Boolean(baselineError)} />
              <button type="button" className="button button--primary button--sm" onClick={saveBaseline}>
                Save
              </button>
              <button type="button" className="button button--ghost button--sm" onClick={() => setEditingBaseline(false)}>
                Cancel
              </button>
              {baselineError && <p className="field__error">{baselineError}</p>}
            </div>
          ) : (
            <p className="checkin-baseline__value">
              <span className="num">{baseline ?? '—'}</span> {baseline !== null && 'push-ups'}
              <button
                type="button"
                className="icon-button icon-button--small"
                onClick={() => {
                  setBaselineInput(String(baseline ?? ''));
                  setEditingBaseline(true);
                }}
                aria-label="Edit push-up baseline"
              >
                <Pencil size={14} aria-hidden />
              </button>
            </p>
          )}
          {latest && baseline !== null && (
            <p className="small">
              Latest check-in: <strong className="num">{latest.pushupCount}</strong> ({latest.pushupCount - baseline >= 0 ? '+' : ''}
              {latest.pushupCount - baseline} vs. baseline)
            </p>
          )}
        </div>
        <div>
          <p className="small muted">Suggested check-in weeks</p>
          <ul className="checkin-weeks">
            {RECOMMENDED_CHECKIN_WEEKS.map((w) => {
              const done = weeksWithCheckin.has(w);
              return (
                <li key={w} className={`pill ${done ? 'pill--target-met' : w <= currentWeek ? 'pill--current' : 'pill--neutral'}`}>
                  Week {w}: {done ? 'recorded' : w <= currentWeek ? 'open' : 'later'}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <form className="checkin-form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor={`${id}-date`}>Check-in date</label>
          <input id={`${id}-date`} type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? `${id}-date-e` : undefined} />
          {errors.date && <p id={`${id}-date-e`} className="field__error">{errors.date}</p>}
        </div>
        <div className="field">
          <label htmlFor={`${id}-p`}>Push-up reps</label>
          <input id={`${id}-p`} type="number" inputMode="numeric" min={0} max={500} value={pushups} onChange={(e) => setPushups(e.target.value)} aria-invalid={Boolean(errors.pushups)} aria-describedby={errors.pushups ? `${id}-p-e` : undefined} required />
          {errors.pushups && <p id={`${id}-p-e`} className="field__error">{errors.pushups}</p>}
        </div>
        <div className="field">
          <label htmlFor={`${id}-w`}>Body weight, kg (optional)</label>
          <input id={`${id}-w`} type="number" inputMode="decimal" step="0.1" min={20} max={400} value={weight} onChange={(e) => setWeight(e.target.value)} aria-invalid={Boolean(errors.weight)} aria-describedby={errors.weight ? `${id}-w-e` : undefined} />
          {errors.weight && <p id={`${id}-w-e`} className="field__error">{errors.weight}</p>}
        </div>
        <div className="field field--full">
          <label htmlFor={`${id}-n`}>Notes</label>
          <input id={`${id}-n`} type="text" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Variation used, how it felt…" />
        </div>
        <div className="field--full">
          <button type="submit" className="button button--primary">
            Save check-in
          </button>
        </div>
      </form>

      {checkins.length === 0 ? (
        <EmptyState icon={<ClipboardList size={28} />} title="No check-ins yet">
          <p>Record your starting push-up baseline.</p>
        </EmptyState>
      ) : (
        <ul className="history">
          {checkins.map((c) => (
            <li key={c.id} className="history__item">
              <div className="history__main">
                <span className="history__date num">{formatDate(c.date, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="history__title">
                  <span className="num">{c.pushupCount}</span> push-ups
                  {c.bodyWeightKg !== null && <span className="muted"> · {c.bodyWeightKg} kg</span>}
                </span>
                {c.notes && <span className="muted small">{c.notes}</span>}
              </div>
              <button type="button" className="icon-button" onClick={() => setToDelete(c.id)} aria-label={`Delete check-in from ${formatDate(c.date)}`}>
                <Trash2 size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this check-in?"
        tone="danger"
        confirmLabel="Delete check-in"
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteCheckin(toDelete);
          setToDelete(null);
          notify('Check-in deleted.', 'info');
        }}
      >
        <p>This can't be undone.</p>
      </ConfirmDialog>
    </section>
  );
}

type Filter = 'all' | 'strength' | 'mobility' | 'minimum';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All activity' },
  { id: 'strength', label: 'Strength' },
  { id: 'mobility', label: 'Mobility' },
  { id: 'minimum', label: 'Minimum workouts' },
];

type HistoryEntry = { kind: 'workout'; session: WorkoutSession } | { kind: 'mobility'; session: MobilitySession };

function History({ navigate }: ProgressProps) {
  const { data, deleteWorkoutSession, deleteMobilitySession } = useAppData();
  const { notify } = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(20);
  const [toDelete, setToDelete] = useState<HistoryEntry | null>(null);

  const entries: HistoryEntry[] = [
    ...data.workoutSessions.filter((s) => s.completed).map((session) => ({ kind: 'workout' as const, session })),
    ...data.mobilitySessions.filter((s) => s.completed).map((session) => ({ kind: 'mobility' as const, session })),
  ]
    .filter((e) => {
      if (filter === 'all') return true;
      if (filter === 'mobility') return e.kind === 'mobility';
      if (e.kind !== 'workout') return false;
      return filter === 'minimum' ? e.session.workoutType === 'minimum' : e.session.workoutType !== 'minimum';
    })
    .sort((a, b) => compareSessionsDesc(a.session, b.session));

  const emptyText: Record<Filter, string> = {
    all: 'No workouts yet: Your first session starts the story.',
    strength: 'No strength sessions yet: Your first session starts the story.',
    mobility: 'No mobility sessions yet: Try a five-minute warm-up.',
    minimum: 'No minimum sessions logged. They are there for the hard days.',
  };

  return (
    <section className="card" aria-labelledby="history-title">
      <div className="card__header card__header--row">
        <h2 id="history-title" className="card__title">
          History
        </h2>
        <div className="chip-group" role="radiogroup" aria-label="Filter history">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={filter === f.id} className={`chip${filter === f.id ? ' is-active' : ''}`} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={28} />}
          title={emptyText[filter]}
          action={
            filter === 'mobility' ? (
              <button type="button" className="button button--secondary" onClick={() => navigate('mobility', 'warmup')}>
                Open warm-up
              </button>
            ) : (
              <button type="button" className="button button--secondary" onClick={() => navigate('workouts', filter === 'minimum' ? 'minimum' : 'A')}>
                Go to workouts
              </button>
            )
          }
        />
      ) : (
        <ul className="history history--detailed">
          {entries.slice(0, limit).map((e) => (
            <li key={e.session.id} className="history__item">
              <HistoryRow entry={e} />
              <button
                type="button"
                className="icon-button"
                onClick={() => setToDelete(e)}
                aria-label={`Delete ${e.kind === 'mobility' ? 'mobility session' : 'workout'} from ${formatDate(e.session.date)}`}
              >
                <Trash2 size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {entries.length > limit && (
        <button type="button" className="button button--ghost" onClick={() => setLimit((l) => l + 20)}>
          Show more ({entries.length - limit} older)
        </button>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this entry?"
        tone="danger"
        confirmLabel="Delete entry"
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete?.kind === 'workout') deleteWorkoutSession(toDelete.session.id);
          if (toDelete?.kind === 'mobility') deleteMobilitySession(toDelete.session.id);
          setToDelete(null);
          notify('Entry deleted.', 'info');
        }}
      >
        <p>Use this for accidental or duplicate entries. It's removed from history and statistics, and can't be undone.</p>
      </ConfirmDialog>
    </section>
  );
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  if (entry.kind === 'mobility') {
    const s = entry.session;
    const routine = MOBILITY_ROUTINES[s.routineId];
    return (
      <div className="history__main">
        <span className="history__date num">{formatDate(s.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        <span className="history__title">
          <span className="tag tag--mobility">Mobility</span> {routine.name}
        </span>
        <span className="muted small">
          {formatDuration(s.durationSeconds)} · {s.exercisesCompleted.length}/{routine.movements.length} movements
          {s.exercisesCompleted.length > 0 && s.exercisesCompleted.length < routine.movements.length ? `: ${s.exercisesCompleted.map(movementName).join(', ')}` : ''}
        </span>
        {s.notes && <span className="history__notes small">“{s.notes}”</span>}
      </div>
    );
  }
  const s = entry.session;
  const isMin = s.workoutType === 'minimum';
  const done = s.exerciseResults.filter((r) => r.completed);
  return (
    <div className="history__main">
      <span className="history__date num">{formatDate(s.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
      <span className="history__title">
        <span className={`tag ${isMin ? 'tag--minimum' : 'tag--strength'}`}>{isMin ? 'Minimum' : `Workout ${s.workoutType}`}</span>{' '}
        {isMin ? 'Minimum session' : WORKOUTS[s.workoutType as 'A' | 'B'].name}
      </span>
      <span className="muted small">
        {formatDuration(s.durationSeconds)} · {done.length}/{s.exerciseResults.length} exercises completed
      </span>
      {done.length > 0 && (
        <span className="history__exercises small">
          {done
            .map((r) => {
              const detail = r.holdDurationSeconds !== null ? `${r.holdDurationSeconds}s` : r.repsPerSet.length ? r.repsPerSet.join('/') : '';
              return `${exerciseName(r.exerciseId)}${detail ? ` (${detail})` : ''}`;
            })
            .join(' · ')}
        </span>
      )}
      {s.notes && <span className="history__notes small">“{s.notes}”</span>}
    </div>
  );
}
