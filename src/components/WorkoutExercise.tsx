import { useId } from 'react';
import { Check, Info, Minus, Plus, TimerReset, Hourglass } from 'lucide-react';
import type { DraftExercise, ExerciseDefinition } from '../types';

export const MAX_SETS = 5;
const MAX_VALUE = 999;

interface WorkoutExerciseProps {
  index: number;
  exercise: ExerciseDefinition;
  /** Null when no workout is in progress — the card is then a read-only guide. */
  draft: DraftExercise | null;
  onChange: (patch: Partial<Omit<DraftExercise, 'exerciseId'>>) => void;
  onRest: () => void;
  onHold?: () => void;
}

function unitShort(exercise: ExerciseDefinition): string {
  switch (exercise.unit) {
    case 'seconds':
      return 'sec';
    case 'reps per side':
      return 'reps/side';
    case 'reps per leg':
      return 'reps/leg';
    case 'reps per position':
      return 'reps/position';
    default:
      return 'reps';
  }
}

export function WorkoutExercise({ index, exercise, draft, onChange, onRest, onHold }: WorkoutExerciseProps) {
  const baseId = useId();
  const completed = draft?.completed ?? false;
  const disabled = draft === null;

  const setSets = (n: number) => {
    if (!draft) return;
    const plannedSets = Math.min(MAX_SETS, Math.max(1, n));
    const values = Array.from({ length: plannedSets }, (_, i) => draft.values[i] ?? null);
    onChange({ plannedSets, values });
  };

  const setValue = (i: number, raw: string) => {
    if (!draft) return;
    const parsed = raw.trim() === '' ? null : Math.min(MAX_VALUE, Math.max(0, Math.round(Number(raw))));
    const values = [...draft.values];
    values[i] = parsed === null || Number.isNaN(parsed) ? null : parsed;
    onChange({ values });
  };

  return (
    <article className={`card exercise${completed ? ' is-complete' : ''}`} aria-labelledby={`${baseId}-name`}>
      <div className="exercise__head">
        <label className={`check${disabled ? ' is-disabled' : ''}`}>
          <input
            type="checkbox"
            checked={completed}
            disabled={disabled}
            onChange={(e) => onChange({ completed: e.target.checked })}
            aria-describedby={`${baseId}-status`}
          />
          <span className="check__box" aria-hidden>
            <Check size={16} strokeWidth={3} />
          </span>
          <span className="visually-hidden">Mark {exercise.name} complete</span>
        </label>
        <div className="exercise__title">
          <h3 id={`${baseId}-name`} className="exercise__name">
            <span className="exercise__index num">{index + 1}</span>
            {exercise.name}
          </h3>
          <p className="exercise__target">
            <span className="num">{exercise.sets}</span> {exercise.sets === 1 ? 'set' : 'sets'} × {exercise.target} · rest {exercise.restSeconds} s
          </p>
        </div>
        <span id={`${baseId}-status`} className={`pill ${completed ? 'pill--target-met' : 'pill--neutral'}`}>
          {completed ? 'Done' : 'To do'}
        </span>
      </div>

      <p className="exercise__instructions">{exercise.instructions}</p>
      {exercise.easierVariation && (
        <p className="exercise__note">
          <strong>Easier option:</strong> {exercise.easierVariation}
        </p>
      )}
      {exercise.limitation && (
        <p className="exercise__note exercise__note--info">
          <Info size={16} aria-hidden /> {exercise.limitation}
        </p>
      )}

      {draft && (
        <div className="exercise__tracking">
          <div className="stepper" role="group" aria-label={`Sets for ${exercise.name}`}>
            <span className="stepper__label">Sets</span>
            <button type="button" className="icon-button icon-button--small" onClick={() => setSets(draft.plannedSets - 1)} disabled={draft.plannedSets <= 1} aria-label="Remove a set">
              <Minus size={16} aria-hidden />
            </button>
            <span className="stepper__value num" aria-live="polite">
              {draft.plannedSets}
            </span>
            <button type="button" className="icon-button icon-button--small" onClick={() => setSets(draft.plannedSets + 1)} disabled={draft.plannedSets >= MAX_SETS} aria-label="Add a set">
              <Plus size={16} aria-hidden />
            </button>
          </div>
          <div className="set-inputs">
            {draft.values.map((v, i) => (
              <label key={i} className="set-input">
                <span className="set-input__label">Set {i + 1}</span>
                <span className="set-input__field">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={MAX_VALUE}
                    value={v ?? ''}
                    placeholder="–"
                    onChange={(e) => setValue(i, e.target.value)}
                    aria-label={`${exercise.name} set ${i + 1}, ${exercise.unit}`}
                  />
                  <span className="set-input__unit">{unitShort(exercise)}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="muted small">{exercise.trackingLabel}. Leave a set blank if you skipped it.</p>
        </div>
      )}

      <div className="exercise__actions">
        {onHold && exercise.durationSeconds && (
          <button type="button" className="button button--secondary button--sm" onClick={onHold}>
            <Hourglass size={16} aria-hidden /> Hold timer {exercise.durationSeconds} s
          </button>
        )}
        <button type="button" className="button button--secondary button--sm" onClick={onRest}>
          <TimerReset size={16} aria-hidden /> Rest {exercise.restSeconds} s
        </button>
      </div>
    </article>
  );
}
