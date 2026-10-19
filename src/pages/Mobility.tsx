import { useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, ChevronRight, Footprints, Pause, Play, SkipForward, Trash2, X } from 'lucide-react';
import type { PageId, RoutineId } from '../types';
import { useAppData } from '../state/AppDataContext';
import { useSharedTimer } from '../state/TimerContext';
import { useToast } from '../state/ToastContext';
import { usePlan } from '../hooks/usePlan';
import { MOBILITY_ROUTINES, MOBILITY_SAFETY, movementName } from '../data/mobility';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LogSessionDialog, MAX_SESSION_MINUTES } from '../components/LogSessionDialog';
import { ProgressCard } from '../components/ProgressCard';
import { EmptyState } from '../components/EmptyState';
import { TimerFace } from '../components/Timer';
import { compareSessionsDesc, summarizeWeek } from '../utils/stats';
import { formatClock, formatDate, formatDuration } from '../utils/date';

interface MobilityProps {
  sub: string | null;
  navigate: (page: PageId, sub?: string | null) => void;
}

const ROUTINE_IDS: RoutineId[] = ['warmup', 'recovery'];

export function Mobility({ sub, navigate }: MobilityProps) {
  const { data, startMobility, logMobilityManually, deleteMobilitySession } = useAppData();
  const { notify } = useToast();
  const { currentWeek } = usePlan();
  const active = data.activeMobility;
  const routineId: RoutineId = sub === 'warmup' || sub === 'recovery' ? sub : (active?.routineId ?? 'warmup');
  const routine = MOBILITY_ROUTINES[routineId];

  const [confirmReplace, setConfirmReplace] = useState(false);
  const [manualLog, setManualLog] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const sessions = data.mobilitySessions.filter((s) => s.completed).sort(compareSessionsDesc);
  const totalSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const weekCount = summarizeWeek(data, currentWeek).mobility.length;

  const start = () => {
    if (active && active.routineId !== routineId) {
      setConfirmReplace(true);
      return;
    }
    if (!active) startMobility(routineId);
  };

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">Mobility</h1>
        <p className="page__lead">Short, comfortable movement to prepare for training or recover on rest days. Tracked separately from strength.</p>
      </header>

      <div className="tabs" role="tablist" aria-label="Routine">
        {ROUTINE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`mtab-${id}`}
            aria-selected={routineId === id}
            aria-controls="mobility-panel"
            tabIndex={routineId === id ? 0 : -1}
            className={`tabs__tab${routineId === id ? ' is-active' : ''}`}
            onClick={() => navigate('mobility', id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const next = id === 'warmup' ? 'recovery' : 'warmup';
                navigate('mobility', next);
                window.setTimeout(() => document.getElementById(`mtab-${next}`)?.focus(), 0);
              }
            }}
          >
            {MOBILITY_ROUTINES[id].name}
            {active?.routineId === id && <span className="tabs__badge">In progress</span>}
          </button>
        ))}
      </div>

      <div id="mobility-panel" role="tabpanel" aria-labelledby={`mtab-${routineId}`} className="two-col">
        <div className="stack">
          {active && active.routineId === routineId ? (
            <MobilityPlayer />
          ) : (
            <section className="card">
              <p className="eyebrow">
                About <span className="num">{routine.durationMinutes}</span> minutes · {routine.movements.length} movements
              </p>
              <h2 className="workout__name">{routine.name}</h2>
              <p>{routine.description}</p>
              {active && (
                <p className="notice notice--info">
                  {MOBILITY_ROUTINES[active.routineId].name} is in progress.{' '}
                  <button type="button" className="link-button" onClick={() => navigate('mobility', active.routineId)}>
                    Continue it
                  </button>
                </p>
              )}
              <div className="button-row">
                <button type="button" className="button button--primary button--lg" onClick={start}>
                  <Play size={20} aria-hidden /> Start guided routine
                </button>
                <button type="button" className="button button--secondary" onClick={() => setManualLog(true)}>
                  <Check size={18} aria-hidden /> Already did it? Log it
                </button>
              </div>
              <ol className="movement-list">
                {routine.movements.map((m) => (
                  <li key={m.id} className="movement">
                    <div className="movement__head">
                      <strong>{m.name}</strong>
                      <span className="muted num">{formatClock(m.durationSeconds)}</span>
                    </div>
                    <p className="muted small">{m.instructions}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="card card--quiet" aria-labelledby="mobility-safety">
            <h2 id="mobility-safety" className="card__title">
              <AlertTriangle size={18} aria-hidden /> Move comfortably
            </h2>
            <ul className="bullets">
              {MOBILITY_SAFETY.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="muted small">Tuesday, Thursday, and Saturday are great days for an optional recovery routine.</p>
          </section>
        </div>

        <div className="stack">
          <div className="stats-grid stats-grid--compact">
            <ProgressCard label="Mobility sessions" value={sessions.length} icon={<Footprints size={18} />} />
            <ProgressCard label="This plan week" value={weekCount} hint={`Week ${currentWeek}`} />
            <ProgressCard label="Mobility time" value={formatDuration(totalSeconds)} />
          </div>

          <section className="card" aria-labelledby="mobility-history">
            <h2 id="mobility-history" className="card__title">Mobility history</h2>
            {sessions.length === 0 ? (
              <EmptyState icon={<Footprints size={28} />} title="No mobility sessions yet">
                <p>Try a five-minute warm-up.</p>
              </EmptyState>
            ) : (
              <ul className="history">
                {sessions.slice(0, 12).map((s) => (
                  <li key={s.id} className="history__item">
                    <div className="history__main">
                      <span className="history__date num">{formatDate(s.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span className="history__title">{MOBILITY_ROUTINES[s.routineId].name}</span>
                      <span className="muted small">
                        {formatDuration(s.durationSeconds)} · {s.exercisesCompleted.length} of {MOBILITY_ROUTINES[s.routineId].movements.length} movements
                      </span>
                    </div>
                    <button type="button" className="icon-button" onClick={() => setToDelete(s.id)} aria-label={`Delete mobility session from ${formatDate(s.date)}`}>
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {sessions.length > 12 && <p className="muted small">Showing the 12 most recent. See Progress for full history.</p>}
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReplace}
        title="Switch routines?"
        tone="danger"
        confirmLabel={`Start ${routine.name}`}
        cancelLabel="Keep current"
        onCancel={() => setConfirmReplace(false)}
        onConfirm={() => {
          setConfirmReplace(false);
          startMobility(routineId);
        }}
      >
        <p>{active ? MOBILITY_ROUTINES[active.routineId].name : 'Another routine'} is in progress. Switching discards its progress without logging it.</p>
      </ConfirmDialog>

      <LogSessionDialog
        open={manualLog}
        title={`Log ${routine.name}?`}
        confirmLabel="Save mobility session"
        defaultMinutes={routine.durationMinutes}
        summary={<p>All {routine.movements.length} movements will be recorded as done.</p>}
        onCancel={() => setManualLog(false)}
        onConfirm={(v) => {
          logMobilityManually({ routineId, exercisesCompleted: routine.movements.map((m) => m.id), durationSeconds: v.durationSeconds, date: v.date, notes: v.notes });
          setManualLog(false);
          notify('Mobility practice logged. Nice work.');
        }}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this mobility session?"
        tone="danger"
        confirmLabel="Delete session"
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteMobilitySession(toDelete);
          setToDelete(null);
          notify('Mobility session deleted.', 'info');
        }}
      >
        <p>This removes it from your history and statistics. This can't be undone.</p>
      </ConfirmDialog>
    </div>
  );
}

function MobilityPlayer() {
  const { data, markMobilityMovement, goToMobilityIndex, cancelMobility, finishMobility } = useAppData();
  const timer = useSharedTimer();
  const { notify } = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [logging, setLogging] = useState(false);
  const active = data.activeMobility!;
  const routine = MOBILITY_ROUTINES[active.routineId];
  const total = routine.movements.length;
  const finished = active.index >= total;
  const movement = finished ? null : routine.movements[active.index];
  const tag = movement ? `mobility:${routine.id}:${movement.id}` : null;
  const timerIsMine = tag !== null && timer.state.tag === tag;
  const holdDone = timerIsMine && timer.state.status === 'completed';

  const next = (outcome: 'done' | 'skipped') => {
    if (!movement) return;
    if (timerIsMine) timer.reset();
    markMobilityMovement(movement.id, outcome);
  };

  const [logMinutes, setLogMinutes] = useState(5);
  const openLog = () => {
    setLogMinutes(Math.min(MAX_SESSION_MINUTES, Math.max(1, Math.round((Date.now() - Date.parse(active.startedAt)) / 60_000))));
    setLogging(true);
  };

  return (
    <section className="card player" aria-labelledby="player-title">
      <div className="player__head">
        <p className="eyebrow" id="player-title">
          {routine.name} · {finished ? 'Finished' : `Movement ${active.index + 1} of ${total}`}
        </p>
        <button type="button" className="button button--ghost button--sm" onClick={() => setConfirmCancel(true)}>
          <X size={16} aria-hidden /> End routine
        </button>
      </div>
      <ol className="player__steps" aria-label="Routine progress">
        {routine.movements.map((m, i) => {
          const state = active.completedIds.includes(m.id) ? 'done' : active.skippedIds.includes(m.id) ? 'skipped' : i === active.index ? 'current' : 'todo';
          return (
            <li key={m.id} className={`player__step player__step--${state}`}>
              <span className="visually-hidden">
                {m.name}: {state === 'todo' ? 'to do' : state}
              </span>
            </li>
          );
        })}
      </ol>

      {movement ? (
        <>
          <h2 className="player__name">{movement.name}</h2>
          <p className="player__instructions">{movement.instructions}</p>
          {timerIsMine ? (
            <TimerFace size="compact" />
          ) : (
            <p className="player__duration num">{formatClock(movement.durationSeconds)}</p>
          )}
          <div className="button-row button-row--center">
            {!timerIsMine || timer.state.status === 'idle' ? (
              <button
                type="button"
                className="button button--primary button--lg"
                onClick={() => timer.requestStart({ seconds: movement.durationSeconds, label: movement.name, kind: 'mobility', tag })}
              >
                <Play size={20} aria-hidden /> Start {movement.durationSeconds} s
              </button>
            ) : timer.state.status === 'running' ? (
              <button type="button" className="button button--secondary button--lg" onClick={timer.pause}>
                <Pause size={20} aria-hidden /> Pause
              </button>
            ) : timer.state.status === 'paused' ? (
              <button type="button" className="button button--secondary button--lg" onClick={timer.resume}>
                <Play size={20} aria-hidden /> Resume
              </button>
            ) : null}
            <button type="button" className={`button button--lg ${holdDone ? 'button--primary' : 'button--secondary'}`} onClick={() => next('done')}>
              <Check size={20} aria-hidden /> {active.index + 1 === total ? 'Done' : 'Done · next'} <ChevronRight size={18} aria-hidden />
            </button>
          </div>
          <div className="button-row button-row--center">
            <button type="button" className="button button--ghost button--sm" onClick={() => goToMobilityIndex(active.index - 1)} disabled={active.index === 0}>
              <ArrowLeft size={16} aria-hidden /> Previous
            </button>
            <button type="button" className="button button--ghost button--sm" onClick={() => next('skipped')}>
              <SkipForward size={16} aria-hidden /> Skip
            </button>
          </div>
          {holdDone && <p className="notice notice--success">Time's up. Move on whenever you're ready.</p>}
        </>
      ) : (
        <div className="player__finished">
          <h2 className="player__name">Routine finished</h2>
          <p>
            <span className="num">{active.completedIds.length}</span> of {total} movements done
            {active.skippedIds.length > 0 ? `, ${active.skippedIds.length} skipped` : ''}.
          </p>
          <div className="button-row button-row--center">
            <button type="button" className="button button--primary button--lg" onClick={openLog} disabled={active.completedIds.length === 0}>
              <Check size={20} aria-hidden /> Log mobility session
            </button>
            <button type="button" className="button button--ghost" onClick={() => goToMobilityIndex(total - 1)}>
              <ArrowLeft size={16} aria-hidden /> Back
            </button>
          </div>
          {active.completedIds.length === 0 && <p className="muted small">Every movement was skipped, so there's nothing to log. You can go back or end the routine.</p>}
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        title="End this routine without logging?"
        tone="danger"
        confirmLabel="End routine"
        cancelLabel="Keep going"
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => {
          setConfirmCancel(false);
          if (timerIsMine) timer.reset();
          cancelMobility();
          notify('Routine ended. Nothing was logged.', 'info');
        }}
      >
        <p>Progress through this routine will be cleared.</p>
      </ConfirmDialog>

      <LogSessionDialog
        open={logging}
        title={`Log ${routine.name}?`}
        confirmLabel="Save mobility session"
        defaultMinutes={logMinutes}
        summary={
          <p>
            {active.completedIds.length} of {total} movements done: {active.completedIds.map(movementName).join(', ')}.
          </p>
        }
        onCancel={() => setLogging(false)}
        onConfirm={(v) => {
          const saved = finishMobility({ durationSeconds: v.durationSeconds, date: v.date, notes: v.notes });
          setLogging(false);
          if (saved) notify('Mobility practice logged. Nice work.');
        }}
      />
    </section>
  );
}
