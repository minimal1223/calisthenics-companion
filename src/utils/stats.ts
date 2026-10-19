import type { AppData, LocalDate, MobilitySession, StrengthWorkoutId, WorkoutSession } from '../types';
import { WEEKLY_STRENGTH_TARGET } from '../data/plan';
import { addDays, planWeekOf } from './date';

export const isStrengthSession = (s: WorkoutSession) => s.completed && (s.workoutType === 'A' || s.workoutType === 'B');
export const isMinimumSession = (s: WorkoutSession) => s.completed && s.workoutType === 'minimum';

/** Local dates with at least one completed workout (full or minimum) or mobility session. */
export function activityDates(data: Pick<AppData, 'workoutSessions' | 'mobilitySessions'>): Set<LocalDate> {
  const dates = new Set<LocalDate>();
  for (const s of data.workoutSessions) if (s.completed) dates.add(s.date);
  for (const s of data.mobilitySessions) if (s.completed) dates.add(s.date);
  return dates;
}

/**
 * Active streak rule:
 * Counts consecutive local calendar days that each have at least one logged activity —
 * a strength workout, a minimum workout, or a mobility session. The count ends today if
 * today has activity; otherwise it ends yesterday, so an un-logged "today" never breaks it
 * early. A day with no activity resets the count to zero. Nothing is lost when it resets.
 */
export function activeStreak(dates: Set<LocalDate>, todayDate: LocalDate): { days: number; includesToday: boolean } {
  const includesToday = dates.has(todayDate);
  let cursor = includesToday ? todayDate : addDays(todayDate, -1);
  let days = 0;
  while (dates.has(cursor)) {
    days += 1;
    cursor = addDays(cursor, -1);
  }
  return { days, includesToday };
}

export interface WeekSummary {
  week: number;
  strength: WorkoutSession[];
  minimum: WorkoutSession[];
  mobility: MobilitySession[];
}

export function summarizeWeek(data: Pick<AppData, 'workoutSessions' | 'mobilitySessions' | 'settings'>, week: number): WeekSummary {
  const start = data.settings.planStartDate;
  const inWeek = (date: LocalDate) => planWeekOf(date, start) === week;
  return {
    week,
    strength: data.workoutSessions.filter((s) => isStrengthSession(s) && inWeek(s.date)),
    minimum: data.workoutSessions.filter((s) => isMinimumSession(s) && inWeek(s.date)),
    mobility: data.mobilitySessions.filter((s) => s.completed && inWeek(s.date)),
  };
}

export type WeekStatus = 'upcoming' | 'current' | 'target-met' | 'some-activity' | 'no-activity';

/** Status comes only from recorded activity — a past week is never "complete" just because it passed. */
export function weekStatus(summary: WeekSummary, currentWeek: number): WeekStatus {
  if (summary.week > currentWeek) return 'upcoming';
  if (summary.strength.length >= WEEKLY_STRENGTH_TARGET) return 'target-met';
  if (summary.week === currentWeek) return 'current';
  const any = summary.strength.length + summary.minimum.length + summary.mobility.length > 0;
  return any ? 'some-activity' : 'no-activity';
}

export const WEEK_STATUS_LABEL: Record<WeekStatus, string> = {
  upcoming: 'Upcoming',
  current: 'In progress',
  'target-met': 'Target met',
  'some-activity': 'Some activity',
  'no-activity': 'No activity logged',
};

export function totalTrainingSeconds(data: Pick<AppData, 'workoutSessions' | 'mobilitySessions'>): number {
  let total = 0;
  for (const s of data.workoutSessions) if (s.completed) total += s.durationSeconds;
  for (const s of data.mobilitySessions) if (s.completed) total += s.durationSeconds;
  return total;
}

/** Next workout in A/B rotation based on the most recent completed full session. */
export function nextInRotation(sessions: WorkoutSession[]): StrengthWorkoutId {
  const last = [...sessions].filter(isStrengthSession).sort(compareSessionsDesc)[0];
  return last?.workoutType === 'A' ? 'B' : 'A';
}

export function compareSessionsDesc(a: { date: string; completedAt?: string }, b: { date: string; completedAt?: string }): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return (b.completedAt ?? '').localeCompare(a.completedAt ?? '');
}

export interface PersonalRecord {
  exerciseId: string;
  bestSet: number;
  unit: 'reps' | 'seconds';
  date: LocalDate;
}

/** Best single set (or longest hold) per exercise, from real logged results only. */
export function personalRecords(sessions: WorkoutSession[]): PersonalRecord[] {
  const best = new Map<string, PersonalRecord>();
  for (const s of sessions) {
    if (!isStrengthSession(s)) continue;
    for (const r of s.exerciseResults) {
      const hold = r.holdDurationSeconds;
      const value = hold !== null ? hold : Math.max(0, ...r.repsPerSet);
      if (value <= 0) continue;
      const prev = best.get(r.exerciseId);
      if (!prev || value > prev.bestSet) {
        best.set(r.exerciseId, { exerciseId: r.exerciseId, bestSet: value, unit: hold !== null ? 'seconds' : 'reps', date: s.date });
      }
    }
  }
  return [...best.values()];
}
