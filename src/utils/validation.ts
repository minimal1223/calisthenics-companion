import type {
  ActiveMobility,
  ActiveWorkout,
  AppData,
  DraftExercise,
  ExerciseResult,
  MobilitySession,
  RoutineId,
  Settings,
  StrengthCheckin,
  WorkoutSession,
  WorkoutType,
} from '../types';
import { isValidLocalDate, today } from './date';

export const SCHEMA_VERSION = 1 as const;

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isNonNegNum = (v: unknown): v is number => isNum(v) && v >= 0;
const isStr = (v: unknown): v is string => typeof v === 'string';
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isId = (v: unknown): v is string => isStr(v) && v.length > 0 && v.length <= 100;
const isTimestamp = (v: unknown): v is string => isStr(v) && !Number.isNaN(Date.parse(v));
const WORKOUT_TYPES: WorkoutType[] = ['A', 'B', 'minimum'];
const ROUTINES: RoutineId[] = ['warmup', 'recovery'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function defaultSettings(): Settings {
  return {
    planStartDate: today(),
    preferredWorkoutTime: '',
    theme: 'system',
    soundEnabled: true,
    reducedMotion: false,
    pushupBaseline: 8,
  };
}

export function createEmptyData(): AppData {
  return {
    version: SCHEMA_VERSION,
    settings: defaultSettings(),
    workoutSessions: [],
    mobilitySessions: [],
    checkins: [],
    activeWorkout: null,
    activeMobility: null,
  };
}

export function isExerciseResult(v: unknown): v is ExerciseResult {
  return (
    isObj(v) &&
    isId(v.exerciseId) &&
    isNonNegNum(v.setsCompleted) &&
    Array.isArray(v.repsPerSet) &&
    v.repsPerSet.every(isNonNegNum) &&
    (v.holdDurationSeconds === null || isNonNegNum(v.holdDurationSeconds)) &&
    isBool(v.completed)
  );
}

export function isWorkoutSession(v: unknown): v is WorkoutSession {
  return (
    isObj(v) &&
    isId(v.id) &&
    isValidLocalDate(v.date) &&
    WORKOUT_TYPES.includes(v.workoutType as WorkoutType) &&
    (v.startedAt === null || isTimestamp(v.startedAt)) &&
    isTimestamp(v.completedAt) &&
    isNonNegNum(v.durationSeconds) &&
    isBool(v.completed) &&
    Array.isArray(v.exerciseResults) &&
    v.exerciseResults.every(isExerciseResult) &&
    isStr(v.notes)
  );
}

export function isMobilitySession(v: unknown): v is MobilitySession {
  return (
    isObj(v) &&
    isId(v.id) &&
    isValidLocalDate(v.date) &&
    ROUTINES.includes(v.routineId as RoutineId) &&
    isNonNegNum(v.durationSeconds) &&
    isBool(v.completed) &&
    Array.isArray(v.exercisesCompleted) &&
    v.exercisesCompleted.every(isStr) &&
    (v.completedAt === undefined || isTimestamp(v.completedAt)) &&
    (v.notes === undefined || isStr(v.notes))
  );
}

export function isStrengthCheckin(v: unknown): v is StrengthCheckin {
  return (
    isObj(v) &&
    isId(v.id) &&
    isValidLocalDate(v.date) &&
    isNonNegNum(v.pushupCount) &&
    Number.isInteger(v.pushupCount) &&
    (v.bodyWeightKg === null || (isNum(v.bodyWeightKg) && v.bodyWeightKg > 0)) &&
    isStr(v.notes)
  );
}

function isDraftExercise(v: unknown): v is DraftExercise {
  return (
    isObj(v) &&
    isId(v.exerciseId) &&
    isNum(v.plannedSets) &&
    v.plannedSets >= 1 &&
    Array.isArray(v.values) &&
    v.values.every((x) => x === null || isNonNegNum(x)) &&
    isBool(v.completed)
  );
}

function isActiveWorkout(v: unknown): v is ActiveWorkout {
  return (
    isObj(v) &&
    (v.workoutType === 'A' || v.workoutType === 'B') &&
    isTimestamp(v.startedAt) &&
    Array.isArray(v.exercises) &&
    v.exercises.every(isDraftExercise) &&
    isStr(v.notes)
  );
}

function isActiveMobility(v: unknown): v is ActiveMobility {
  return (
    isObj(v) &&
    ROUTINES.includes(v.routineId as RoutineId) &&
    isTimestamp(v.startedAt) &&
    isNum(v.index) &&
    v.index >= 0 &&
    Array.isArray(v.completedIds) &&
    v.completedIds.every(isStr) &&
    Array.isArray(v.skippedIds) &&
    v.skippedIds.every(isStr)
  );
}

/** Field-by-field settings sanitizer; invalid fields fall back to defaults. */
function sanitizeSettings(v: unknown, issues: string[]): Settings {
  const d = defaultSettings();
  if (!isObj(v)) {
    issues.push('Settings were missing or invalid and have been reset to defaults.');
    return d;
  }
  const out: Settings = {
    planStartDate: isValidLocalDate(v.planStartDate) ? v.planStartDate : d.planStartDate,
    preferredWorkoutTime: isStr(v.preferredWorkoutTime) && (v.preferredWorkoutTime === '' || TIME.test(v.preferredWorkoutTime)) ? v.preferredWorkoutTime : d.preferredWorkoutTime,
    theme: v.theme === 'light' || v.theme === 'dark' || v.theme === 'system' ? v.theme : d.theme,
    soundEnabled: isBool(v.soundEnabled) ? v.soundEnabled : d.soundEnabled,
    reducedMotion: isBool(v.reducedMotion) ? v.reducedMotion : d.reducedMotion,
    pushupBaseline:
      v.pushupBaseline === null ? null : isNonNegNum(v.pushupBaseline) && Number.isInteger(v.pushupBaseline) ? v.pushupBaseline : d.pushupBaseline,
  };
  if (!isValidLocalDate(v.planStartDate)) issues.push('Plan start date was invalid and was reset to today.');
  return out;
}

export type ValidationResult = { ok: true; data: AppData; issues: string[] } | { ok: false; errors: string[] };

/**
 * Migrates older payloads to the current schema. Only version 1 exists today; this is
 * the single place future migrations (v1 -> v2, …) should be added.
 */
export function migrate(raw: Obj): Obj {
  const version = raw.version;
  if (version === undefined) return { ...raw, version: SCHEMA_VERSION };
  return raw;
}

function filterRecords<T>(list: unknown, guard: (x: unknown) => x is T, label: string, issues: string[], strict: boolean, errors: string[]): T[] {
  if (list === undefined) return [];
  if (!Array.isArray(list)) {
    (strict ? errors : issues).push(`${label} is not a list.`);
    return [];
  }
  const valid = list.filter(guard);
  const invalid = list.length - valid.length;
  if (invalid > 0) {
    (strict ? errors : issues).push(`${invalid} ${label.toLowerCase()} record${invalid === 1 ? ' was' : 's were'} invalid${strict ? '' : ' and skipped'}.`);
  }
  const seen = new Set<string>();
  return valid.filter((r) => {
    const id = (r as { id?: string }).id;
    if (!id) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * Validates an unknown payload.
 * - `strict` (imports): any invalid record rejects the whole payload, so nothing is overwritten.
 * - lenient (loading from storage): invalid records are dropped and reported as issues.
 */
export function validateAppData(input: unknown, { strict }: { strict: boolean }): ValidationResult {
  const errors: string[] = [];
  const issues: string[] = [];
  if (!isObj(input)) return { ok: false, errors: ['The data is not a JSON object.'] };
  const raw = migrate(input);
  if (raw.version !== SCHEMA_VERSION) {
    return { ok: false, errors: [`Unsupported data version: ${String(raw.version)}. This app reads version ${SCHEMA_VERSION}.`] };
  }
  if (strict && !isObj(raw.settings)) errors.push('Settings are missing or invalid.');
  if (strict && isObj(raw.settings) && !isValidLocalDate(raw.settings.planStartDate)) errors.push('Plan start date is missing or invalid.');

  const settings = sanitizeSettings(raw.settings, issues);
  const workoutSessions = filterRecords(raw.workoutSessions, isWorkoutSession, 'Workout session', issues, strict, errors);
  const mobilitySessions = filterRecords(raw.mobilitySessions, isMobilitySession, 'Mobility session', issues, strict, errors);
  const checkins = filterRecords(raw.checkins, isStrengthCheckin, 'Check-in', issues, strict, errors);
  const activeWorkout = isActiveWorkout(raw.activeWorkout) ? raw.activeWorkout : null;
  const activeMobility = isActiveMobility(raw.activeMobility) ? raw.activeMobility : null;
  if (raw.activeWorkout != null && !activeWorkout) issues.push('An in-progress workout could not be restored.');
  if (raw.activeMobility != null && !activeMobility) issues.push('An in-progress mobility routine could not be restored.');

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    issues,
    data: { version: SCHEMA_VERSION, settings, workoutSessions, mobilitySessions, checkins, activeWorkout, activeMobility },
  };
}
