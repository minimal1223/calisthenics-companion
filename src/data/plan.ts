import type { StrengthWorkoutId } from '../types';

export const PLAN_WEEKS = 12;
export const WEEKLY_STRENGTH_TARGET = 3;
export const RECOMMENDED_CHECKIN_WEEKS = [1, 4, 8, 12];

export interface Phase {
  id: number;
  name: string;
  firstWeek: number;
  lastWeek: number;
  goal: string;
  guidance: string;
  message: string;
}

export const PHASES: Phase[] = [
  {
    id: 1,
    name: 'Build the habit',
    firstWeek: 1,
    lastWeek: 2,
    goal: 'Learn technique and establish the routine.',
    guidance: 'Start with 1 set if needed and build toward 2 comfortable sets. Do not increase intensity simply because a new week starts.',
    message: 'Learn the movements. Finish feeling like you could do more.',
  },
  {
    id: 2,
    name: 'Establish the routine',
    firstWeek: 3,
    lastWeek: 4,
    goal: 'Work toward two controlled sets per exercise.',
    guidance: 'Add repetitions gradually when technique is stable.',
    message: 'Build the habit. Aim for two controlled sets.',
  },
  {
    id: 3,
    name: 'Build strength',
    firstWeek: 5,
    lastWeek: 8,
    goal: 'Progress toward 2-3 sets and more demanding variations when appropriate.',
    guidance: 'Increase only one variable at a time — sets, reps, or variation, never all at once.',
    message: 'Build strength gradually. Increase one variable at a time.',
  },
  {
    id: 4,
    name: 'Build capability',
    firstWeek: 9,
    lastWeek: 12,
    goal: 'Improve full-body strength, control, and movement confidence.',
    guidance: 'Continue the same movement patterns and add resistance when safely available.',
    message: 'Develop control and capability. Quality beats exhaustion.',
  },
];

export function phaseForWeek(week: number): Phase {
  return PHASES.find((p) => week >= p.firstWeek && week <= p.lastWeek) ?? (week < 1 ? PHASES[0] : PHASES[PHASES.length - 1]);
}

export type DayPlanKind = 'strength' | 'optional' | 'rest';

export interface DayPlan {
  /** 0 = Sunday … 6 = Saturday, matching Date#getDay. */
  dayIndex: number;
  short: string;
  name: string;
  kind: DayPlanKind;
  label: string;
}

/** Weekly calendar keyed by weekday. Friday alternates A/B by plan week (odd = A, even = B). */
export function dayPlan(dayIndex: number, planWeek: number): DayPlan {
  const fridayWorkout: StrengthWorkoutId = planWeek % 2 === 1 ? 'A' : 'B';
  const plans: Record<number, Omit<DayPlan, 'dayIndex'>> = {
    1: { short: 'Mon', name: 'Monday', kind: 'strength', label: 'Strength Workout A' },
    2: { short: 'Tue', name: 'Tuesday', kind: 'optional', label: 'Optional easy walk or mobility' },
    3: { short: 'Wed', name: 'Wednesday', kind: 'strength', label: 'Strength Workout B' },
    4: { short: 'Thu', name: 'Thursday', kind: 'optional', label: 'Rest or gentle mobility' },
    5: { short: 'Fri', name: 'Friday', kind: 'strength', label: `Strength Workout ${fridayWorkout}` },
    6: { short: 'Sat', name: 'Saturday', kind: 'optional', label: 'Optional enjoyable activity' },
    0: { short: 'Sun', name: 'Sunday', kind: 'rest', label: 'Rest and weekly review' },
  };
  return { dayIndex, ...plans[dayIndex] };
}

export function scheduledWorkoutFor(dayIndex: number, planWeek: number): StrengthWorkoutId | null {
  if (dayIndex === 1) return 'A';
  if (dayIndex === 3) return 'B';
  if (dayIndex === 5) return planWeek % 2 === 1 ? 'A' : 'B';
  return null;
}

export const SAFETY_DISCLAIMER =
  'This app provides general beginner fitness guidance, not individualized medical care.';

export const SAFETY_RULES = [
  'Use controlled technique and progress gradually.',
  'Avoid training to failure in the beginner phase — leave 2-3 good reps in reserve.',
  'Rest or reduce training when you feel unusually fatigued.',
  'Stop any exercise that causes pain.',
  'Floor exercises like snow angels and Y-T-W raises do not fully replace progressive pulling exercises. A resistance band or a secure, purpose-built pull-up setup is a good optional future addition.',
  'Never use unstable furniture or improvised overhead supports for rows or hanging exercises.',
];
