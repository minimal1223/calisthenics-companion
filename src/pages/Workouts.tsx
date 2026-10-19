import { useEffect, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, Clock, Flame, HeartHandshake, Play, Timer as TimerIcon, Trash2 } from 'lucide-react';
import type { PageId, StrengthWorkoutId } from '../types';
import { useAppData } from '../state/AppDataContext';
import { useSharedTimer } from '../state/TimerContext';
import { useToast } from '../state/ToastContext';
import { usePlan } from '../hooks/usePlan';
import { WORKOUTS, MINIMUM_WORKOUT, SESSION_FLOW } from '../data/workouts';
import { WorkoutExercise } from '../components/WorkoutExercise';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LogSessionDialog, MAX_SESSION_MINUTES } from '../components/LogSessionDialog';
import { formatDate } from '../utils/date';

type Tab = StrengthWorkoutId | 'minimum';
const TABS: { id: Tab; label: string }[] = [
  { id: 'A', label: 'Workout A' },
  { id: 'B', label: 'Workout B' },
  { id: 'minimum', label: 'Minimum' },
];

interface WorkoutsProps {
  sub: string | null;
  navigate: (page: PageId, sub?: string | null) => void;
}

function useMinuteTicker(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function Workouts({ sub, navigate }: WorkoutsProps) {
  const { data } = useAppData();
  const active = data.activeWorkout;
  const tab: Tab = sub === 'A' || sub === 'B' || sub === 'minimum' ? sub : (active?.workoutType ?? 'A');

  const onTabKey = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = TABS[(index + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    navigate('workouts', next.id);
    window.setTimeout(() => document.getElementById(`tab-${next.id}`)?.focus(), 0);
  };

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">Workouts</h1>
        <p className="page__lead">Two full-body sessions, about 20 minutes each. Controlled reps, 2–3 good reps left in reserve.</p>
      </header>

      <div className="tabs" role="tablist" aria-label="Workout">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className={`tabs__tab${tab === t.id ? ' is-active' : ''}`}
            onClick={() => navigate('workouts', t.id)}
            onKeyDown={(e) => onTabKey(e, i)}
          >
            {t.label}
            {active?.workoutType === t.id && <span className="tabs__badge">In progress</span>}
          </button>
        ))}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'minimum' ? <MinimumWorkout /> : <StrengthWorkout type={tab} navigate={navigate} />}
      </div>
    </div>
  );
}

function StrengthWorkout({ type, navigate }: { type: StrengthWorkoutId; navigate: WorkoutsProps['navigate'] }) {
  const { data, startWorkout, updateDraftExercise, setDraftNotes, discardWorkout, completeWorkout } = useAppData();
  const timer = useSharedTimer();
  const { notify } = useToast();
  const { phase, currentWeek } = usePlan();
  const now = useMinuteTicker();
  const workout = WORKOUTS[type];
  const active = data.activeWorkout;
  const isThisActive = active?.workoutType === type;
  const otherActive = active && !isThisActive ? active : null;

  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [completing, setCompleting] = useState(false);

  const draftFor = (id: string) => (isThisActive ? (active.exercises.find((e) => e.exerciseId === id) ?? null) : null);
  const doneCount = isThisActive ? active.exercises.filter((e) => e.completed).length : 0;
  const elapsedMin = isThisActive ? Math.max(0, (now - Date.parse(active.startedAt)) / 60_000) : 0;
  const defaultMinutes = elapsedMin >= 1 && elapsedMin <= MAX_SESSION_MINUTES ? Math.round(elapsedMin) : elapsedMin < 1 ? 1 : 20;

  const start = () => {
    if (otherActive) {
      setConfirmSwitch(true);
      return;
    }
    startWorkout(type);
    notify(`Workout ${type} started. Your progress saves as you go.`, 'info');
  };

  return (
    <div className="workout">
      <section className="card workout__intro">
        <div className="workout__intro-head">
          <div>
            <p className="eyebrow">Workout {type}</p>
            <h2 className="workout__name">{workout.name}</h2>
          </div>
          {isThisActive ? (
            <p className="pill pill--current">
              <Clock size={14} aria-hidden /> Started {Math.floor(elapsedMin)} min ago · {doneCount}/{workout.exercises.length} done
            </p>
          ) : null}
        </div>

        <div className="phase-box">
          <p className="phase-box__title">
            <Flame size={16} aria-hidden /> Week {currentWeek} · {phase.name}
          </p>
          <p>{phase.guidance}</p>
          <p className="muted small">Still finding it hard? Stay with this phase's volume as long as you need — the plan week never forces a harder exercise.</p>
        </div>

        <ul className="flow" aria-label="Session flow">
          <li>
            <span className="num">{SESSION_FLOW.warmupMinutes}</span> min warm-up
          </li>
          <li>
            <span className="num">{SESSION_FLOW.mainMinutes}</span> min main training
          </li>
          <li>
            <span className="num">{SESSION_FLOW.cooldownMinutes}</span> min cool-down
          </li>
        </ul>
        <p className="muted small">{SESSION_FLOW.flexibility}</p>

        {otherActive && (
          <p className="notice notice--info">
            Workout {otherActive.workoutType} is in progress.{' '}
            <button type="button" className="link-button" onClick={() => navigate('workouts', otherActive.workoutType)}>
              Go to Workout {otherActive.workoutType}
            </button>
          </p>
        )}

        <div className="button-row">
          {!isThisActive && (
            <button type="button" className="button button--primary button--lg" onClick={start}>
              <Play size={20} aria-hidden /> Start Workout {type}
            </button>
          )}
          <button type="button" className="button button--secondary" onClick={() => navigate('mobility', 'warmup')}>
            Warm up first (5 min) <ArrowRight size={16} aria-hidden />
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => {
              timer.requestStart({ seconds: 20 * 60, label: `Workout ${type} · 20 min`, kind: 'workout', tag: 'workout-countdown' });
              navigate('timer');
            }}
          >
            <TimerIcon size={16} aria-hidden /> 20-min countdown
          </button>
        </div>
        {!isThisActive && <p className="muted small">Start the workout to record sets, reps, and completion. Until then, the cards below are a guide.</p>}
      </section>

      <div className="exercise-list">
        {workout.exercises.map((ex, i) => (
          <WorkoutExercise
            key={ex.id}
            index={i}
            exercise={ex}
            draft={draftFor(ex.id)}
            onChange={(patch) => updateDraftExercise(ex.id, patch)}
            onRest={() => timer.requestStart({ seconds: ex.restSeconds, label: `Rest after ${ex.name}`, kind: 'rest', tag: 'workout-set' })}
            onHold={ex.durationSeconds ? () => timer.requestStart({ seconds: ex.durationSeconds!, label: `${ex.name} hold`, kind: 'exercise', tag: 'workout-set' }) : undefined}
          />
        ))}
      </div>

      {isThisActive && (
        <section className="card workout__finish" aria-labelledby="finish-title">
          <h2 id="finish-title" className="card__title">Finish up</h2>
          <div className="field">
            <label htmlFor="session-notes">Session notes</label>
            <textarea id="session-notes" rows={3} maxLength={1000} value={active.notes} onChange={(e) => setDraftNotes(e.target.value)} placeholder="Energy, technique cues, anything worth remembering." />
          </div>
          <p className="muted small">
            <CheckCircle2 size={14} aria-hidden /> Progress is saved on this device as you go — you can switch screens or refresh safely.
          </p>
          <div className="button-row">
            <button type="button" className="button button--primary button--lg" onClick={() => setCompleting(true)}>
              <Check size={20} aria-hidden /> Complete workout
            </button>
            <button type="button" className="button button--ghost" onClick={() => setConfirmDiscard(true)}>
              <Trash2 size={18} aria-hidden /> Discard
            </button>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={confirmSwitch}
        title={`Discard Workout ${otherActive?.workoutType ?? ''} progress?`}
        tone="danger"
        confirmLabel={`Discard and start ${type}`}
        cancelLabel="Keep it"
        onCancel={() => setConfirmSwitch(false)}
        onConfirm={() => {
          setConfirmSwitch(false);
          startWorkout(type);
          notify(`Workout ${type} started.`, 'info');
        }}
      >
        <p>Only one workout can be in progress. The unsaved entries for Workout {otherActive?.workoutType} will be removed.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard this workout?"
        tone="danger"
        confirmLabel="Discard workout"
        cancelLabel="Keep going"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          discardWorkout();
          notify('Workout discarded. Nothing was logged.', 'info');
        }}
      >
        <p>Your entries for this session will be removed and nothing will be logged.</p>
      </ConfirmDialog>

      <LogSessionDialog
        open={completing}
        title={`Log Workout ${type}?`}
        confirmLabel="Save workout"
        defaultMinutes={defaultMinutes}
        defaultNotes={active?.notes ?? ''}
        summary={
          <p>
            <strong className="num">
              {doneCount} of {workout.exercises.length}
            </strong>{' '}
            exercises checked.{' '}
            {doneCount < workout.exercises.length ? 'Unchecked exercises are saved as not completed — a partial session still counts as showing up.' : 'Every exercise done.'}
          </p>
        }
        warningFor={(date) => {
          const same = data.workoutSessions.filter((s) => s.completed && s.workoutType === type && s.date === date);
          return same.length > 0
            ? `You already logged Workout ${type} on ${formatDate(date)}. If this is a second session, save it. If not, choose "Not yet" and discard instead.`
            : null;
        }}
        onCancel={() => setCompleting(false)}
        onConfirm={(values) => {
          const saved = completeWorkout(values);
          setCompleting(false);
          if (saved) notify('Workout saved. Great job showing up!');
        }}
      />
    </div>
  );
}

function MinimumWorkout() {
  const { data, logMinimumWorkout } = useAppData();
  const timer = useSharedTimer();
  const { notify } = useToast();
  const [checked, setChecked] = useState<string[]>([]);
  const [logging, setLogging] = useState(false);
  const count = checked.length;

  return (
    <div className="workout">
      <section className="card card--accent minimum">
        <p className="eyebrow">About {MINIMUM_WORKOUT.durationMinutes} minutes</p>
        <h2 className="workout__name">
          <HeartHandshake size={22} aria-hidden /> The minimum counts.
        </h2>
        <p>On hard days, this is enough. Keeping the habit alive is the win — choosing the easier option is never a step backward.</p>
        <ul className="minimum__list">
          {MINIMUM_WORKOUT.exercises.map((ex) => {
            const isChecked = checked.includes(ex.id);
            return (
              <li key={ex.id}>
                <label className={`minimum__item${isChecked ? ' is-complete' : ''}`}>
                  <span className="check">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => setChecked((list) => (e.target.checked ? [...list, ex.id] : list.filter((x) => x !== ex.id)))}
                    />
                    <span className="check__box" aria-hidden>
                      <Check size={16} strokeWidth={3} />
                    </span>
                  </span>
                  <span className="minimum__name">
                    <strong className="num">{ex.reps}</strong> {ex.name.toLowerCase()}
                  </span>
                  <span className="pill pill--neutral">{isChecked ? 'Done' : 'To do'}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="button-row">
          <button type="button" className="button button--dark button--lg" disabled={count === 0} onClick={() => setLogging(true)}>
            <Check size={20} aria-hidden /> Log minimum session
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => timer.requestStart({ seconds: 120, label: 'Minimum workout · 2 min', kind: 'workout', tag: 'minimum' })}
          >
            <TimerIcon size={16} aria-hidden /> 2-min timer
          </button>
        </div>
        {count === 0 && <p className="small minimum__hint">Check what you did, then log it.</p>}
        <p className="small minimum__hint">
          Minimum sessions keep your streak and habit going. They're shown separately from full workouts, so your strength numbers stay honest.
        </p>
      </section>

      <LogSessionDialog
        open={logging}
        title="Log minimum session?"
        confirmLabel="Save minimum session"
        defaultMinutes={MINIMUM_WORKOUT.durationMinutes}
        summary={<p>{count === 2 ? 'Both movements done.' : '1 of 2 movements done — that still counts.'}</p>}
        warningFor={(date) =>
          data.workoutSessions.some((s) => s.completed && s.workoutType === 'minimum' && s.date === date)
            ? `You already logged a minimum session on ${formatDate(date)}. Save again only if you did it twice.`
            : null
        }
        onCancel={() => setLogging(false)}
        onConfirm={(values) => {
          logMinimumWorkout({ ...values, exerciseIds: checked });
          setLogging(false);
          setChecked([]);
          notify('Minimum session logged. Keeping the habit alive is the win.');
        }}
      />
    </div>
  );
}
