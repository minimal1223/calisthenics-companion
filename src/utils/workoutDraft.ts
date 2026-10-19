import type { ActiveWorkout, ExerciseResult, StrengthWorkoutId } from '../types';
import { WORKOUTS, findExercise } from '../data/workouts';

/** A fresh in-progress workout with the plan's default set counts and nothing entered yet. */
export function draftFor(type: StrengthWorkoutId): ActiveWorkout {
  return {
    workoutType: type,
    startedAt: new Date().toISOString(),
    notes: '',
    exercises: WORKOUTS[type].exercises.map((e) => ({
      exerciseId: e.id,
      plannedSets: e.sets,
      values: Array.from({ length: e.sets }, () => null),
      completed: false,
    })),
  };
}

/** Converts draft entries to stored results; blank or zero sets are not counted as completed sets. */
export function draftToResults(draft: ActiveWorkout): ExerciseResult[] {
  return draft.exercises.map((d) => {
    const isHold = findExercise(d.exerciseId)?.unit === 'seconds';
    const entered = d.values.filter((v): v is number => v !== null && v > 0);
    return {
      exerciseId: d.exerciseId,
      setsCompleted: entered.length,
      repsPerSet: isHold ? [] : entered,
      holdDurationSeconds: isHold ? (entered.length ? Math.max(...entered) : null) : null,
      completed: d.completed,
    };
  });
}
