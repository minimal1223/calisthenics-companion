/** ISO local calendar date, `YYYY-MM-DD`. Never derived from UTC. */
export type LocalDate = string;

export type StrengthWorkoutId = 'A' | 'B';
export type WorkoutType = StrengthWorkoutId | 'minimum';
export type RoutineId = 'warmup' | 'recovery';
export type ThemePreference = 'light' | 'dark' | 'system';

/** How a single set of an exercise is measured. */
export type TrackingUnit = 'reps' | 'reps per side' | 'reps per leg' | 'reps per position' | 'seconds';

export interface ExerciseDefinition {
  id: string;
  name: string;
  sets: number;
  /** Prescribed target shown to the user, e.g. "5-8" or "5 per side". */
  target: string;
  unit: TrackingUnit;
  instructions: string;
  easierVariation?: string;
  limitation?: string;
  restSeconds: number;
  /** For timed holds such as the plank. */
  durationSeconds?: number;
  trackingLabel: string;
}

export interface WorkoutDefinition {
  id: StrengthWorkoutId;
  name: string;
  exercises: ExerciseDefinition[];
}

export interface MobilityMovement {
  id: string;
  name: string;
  durationSeconds: number;
  instructions: string;
}

export interface MobilityRoutine {
  id: RoutineId;
  name: string;
  durationMinutes: number;
  description: string;
  movements: MobilityMovement[];
}

export interface Settings {
  planStartDate: LocalDate;
  /** `HH:mm`, or empty when not set. */
  preferredWorkoutTime: string;
  theme: ThemePreference;
  soundEnabled: boolean;
  reducedMotion: boolean;
  /** Self-reported starting point for controlled push-ups (not a recorded check-in). */
  pushupBaseline: number | null;
}

export interface ExerciseResult {
  exerciseId: string;
  setsCompleted: number;
  /** Reps per completed set. Empty for timed holds. */
  repsPerSet: number[];
  /** Longest hold in seconds, for timed exercises; otherwise null. */
  holdDurationSeconds: number | null;
  completed: boolean;
}

export interface WorkoutSession {
  id: string;
  date: LocalDate;
  workoutType: WorkoutType;
  startedAt: string | null;
  completedAt: string;
  durationSeconds: number;
  completed: boolean;
  exerciseResults: ExerciseResult[];
  notes: string;
}

export interface MobilitySession {
  id: string;
  date: LocalDate;
  routineId: RoutineId;
  durationSeconds: number;
  completed: boolean;
  exercisesCompleted: string[];
  completedAt?: string;
  notes?: string;
}

export interface StrengthCheckin {
  id: string;
  date: LocalDate;
  pushupCount: number;
  bodyWeightKg: number | null;
  notes: string;
}

/** Per-exercise entry while a workout is in progress (before it is logged). */
export interface DraftExercise {
  exerciseId: string;
  plannedSets: number;
  /** One value per planned set: reps, or seconds for holds. Null = not entered. */
  values: (number | null)[];
  completed: boolean;
}

export interface ActiveWorkout {
  workoutType: StrengthWorkoutId;
  startedAt: string;
  exercises: DraftExercise[];
  notes: string;
}

export interface ActiveMobility {
  routineId: RoutineId;
  startedAt: string;
  index: number;
  completedIds: string[];
  skippedIds: string[];
}

export interface AppData {
  version: 1;
  settings: Settings;
  workoutSessions: WorkoutSession[];
  mobilitySessions: MobilitySession[];
  checkins: StrengthCheckin[];
  activeWorkout: ActiveWorkout | null;
  activeMobility: ActiveMobility | null;
}

export type PageId = 'overview' | 'workouts' | 'timer' | 'mobility' | 'progress' | 'settings';

export type TimerKind = 'exercise' | 'rest' | 'mobility' | 'workout' | 'custom';
