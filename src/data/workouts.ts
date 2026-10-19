import type { ExerciseDefinition, StrengthWorkoutId, WorkoutDefinition } from '../types';

export const WORKOUTS: Record<StrengthWorkoutId, WorkoutDefinition> = {
  A: {
    id: 'A',
    name: 'Full-body foundations',
    exercises: [
      {
        id: 'pushups',
        name: 'Push-ups',
        sets: 2,
        target: '5-8',
        unit: 'reps',
        easierVariation: 'Incline push-ups against a sturdy counter or wall',
        instructions: 'Keep the body aligned, lower under control, and stop before form breaks.',
        restSeconds: 60,
        trackingLabel: 'Reps completed per set',
      },
      {
        id: 'squats',
        name: 'Bodyweight squats',
        sets: 2,
        target: '8-12',
        unit: 'reps',
        easierVariation: 'Sit-to-stand from a stable chair',
        instructions: 'Use a comfortable depth, keep feet stable, and control the descent.',
        restSeconds: 60,
        trackingLabel: 'Reps completed per set',
      },
      {
        id: 'reverse_snow_angels',
        name: 'Reverse snow angels',
        sets: 2,
        target: '8-10',
        unit: 'reps',
        instructions: 'Lie face down and sweep the arms slowly from overhead toward the hips.',
        restSeconds: 45,
        trackingLabel: 'Reps completed per set',
        limitation: 'This is light upper-back work, not a replacement for progressive pulling resistance.',
      },
      {
        id: 'glute_bridges',
        name: 'Glute bridges',
        sets: 2,
        target: '10-12',
        unit: 'reps',
        instructions: 'Lift the hips by squeezing the glutes without arching the lower back.',
        restSeconds: 45,
        trackingLabel: 'Reps completed per set',
      },
      {
        id: 'dead_bugs',
        name: 'Dead bugs',
        sets: 2,
        target: '5 per side',
        unit: 'reps per side',
        instructions: 'Extend opposite arm and leg while maintaining a stable trunk.',
        restSeconds: 45,
        trackingLabel: 'Reps completed per side',
      },
    ],
  },
  B: {
    id: 'B',
    name: 'Legs, shoulders, and core',
    exercises: [
      {
        id: 'reverse_lunges',
        name: 'Reverse lunges',
        sets: 2,
        target: '5 per leg',
        unit: 'reps per leg',
        easierVariation: 'Supported shallow reverse lunge',
        instructions: 'Step backward, lower comfortably, and use a stable wall for balance if needed.',
        restSeconds: 60,
        trackingLabel: 'Reps per leg',
      },
      {
        id: 'pike_pushup_prep',
        name: 'Pike push-up preparation',
        sets: 2,
        target: '5-8',
        unit: 'reps',
        easierVariation: 'Wall push-ups',
        instructions: 'Use a comfortable shoulder range and stop if the movement causes pain.',
        restSeconds: 60,
        trackingLabel: 'Reps completed per set',
      },
      {
        id: 'prone_ytw',
        name: 'Prone Y-T-W raises',
        sets: 1,
        target: '5 in each position',
        unit: 'reps per position',
        instructions: 'Lie face down and raise the arms gently in Y, T, and W shapes.',
        restSeconds: 45,
        trackingLabel: 'Rounds completed',
      },
      {
        id: 'glute_bridges_b',
        name: 'Glute bridges',
        sets: 2,
        target: '10',
        unit: 'reps',
        instructions: 'Use regular bridges before attempting staggered or single-leg versions.',
        restSeconds: 45,
        trackingLabel: 'Reps completed per set',
      },
      {
        id: 'plank',
        name: 'Forearm plank',
        sets: 2,
        target: '20 seconds',
        unit: 'seconds',
        durationSeconds: 20,
        instructions: 'Maintain a comfortable straight body position and breathe normally.',
        easierVariation: 'Knee plank',
        restSeconds: 45,
        trackingLabel: 'Hold duration',
      },
    ],
  },
};

export const MINIMUM_WORKOUT = {
  durationMinutes: 2,
  exercises: [
    { id: 'min_wall_pushups', name: 'Wall push-ups', reps: 5 },
    { id: 'min_squats', name: 'Bodyweight squats', reps: 8 },
  ],
} as const;

const exerciseIndex = new Map<string, ExerciseDefinition>();
for (const workout of Object.values(WORKOUTS)) {
  for (const exercise of workout.exercises) exerciseIndex.set(exercise.id, exercise);
}

export function findExercise(id: string): ExerciseDefinition | undefined {
  return exerciseIndex.get(id);
}

export function exerciseName(id: string): string {
  const fromPlan = exerciseIndex.get(id)?.name;
  if (fromPlan) return fromPlan;
  return MINIMUM_WORKOUT.exercises.find((e) => e.id === id)?.name ?? id;
}

export const SESSION_FLOW = {
  warmupMinutes: 3,
  mainMinutes: 14,
  cooldownMinutes: 2,
  flexibility: 'Rest longer or complete fewer sets when needed. Never rush form to meet the time target.',
};
