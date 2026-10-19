import { describe, expect, it } from 'vitest';
import type { AppData, WorkoutSession } from '../types';
import { createEmptyData } from '../utils/validation';
import { activeStreak, activityDates, nextInRotation, personalRecords, summarizeWeek, weekStatus } from '../utils/stats';

function session(date: string, workoutType: WorkoutSession['workoutType'], extra: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: `${workoutType}-${date}-${Math.random()}`,
    date,
    workoutType,
    startedAt: null,
    completedAt: `${date}T18:00:00.000Z`,
    durationSeconds: 1200,
    completed: true,
    exerciseResults: [],
    notes: '',
    ...extra,
  };
}

function dataWith(partial: Partial<AppData>): AppData {
  const d = createEmptyData();
  d.settings.planStartDate = '2026-10-05';
  return { ...d, ...partial };
}

describe('active streak', () => {
  it('counts consecutive local days with any activity, ending today', () => {
    const dates = new Set(['2026-10-17', '2026-10-18', '2026-10-19']);
    expect(activeStreak(dates, '2026-10-19')).toEqual({ days: 3, includesToday: true });
  });

  it('does not break because today has not been logged yet', () => {
    const dates = new Set(['2026-10-17', '2026-10-18']);
    expect(activeStreak(dates, '2026-10-19')).toEqual({ days: 2, includesToday: false });
  });

  it('resets after a full day without activity', () => {
    const dates = new Set(['2026-10-15', '2026-10-16']);
    expect(activeStreak(dates, '2026-10-19').days).toBe(0);
  });

  it('includes minimum and mobility sessions', () => {
    const data = dataWith({
      workoutSessions: [session('2026-10-18', 'minimum')],
      mobilitySessions: [{ id: 'm1', date: '2026-10-19', routineId: 'recovery', durationSeconds: 300, completed: true, exercisesCompleted: [] }],
    });
    expect(activeStreak(activityDates(data), '2026-10-19').days).toBe(2);
  });
});

describe('weekly summaries', () => {
  it('counts minimum sessions separately from strength sessions', () => {
    const data = dataWith({ workoutSessions: [session('2026-10-05', 'A'), session('2026-10-06', 'minimum'), session('2026-10-07', 'B')] });
    const w1 = summarizeWeek(data, 1);
    expect(w1.strength).toHaveLength(2);
    expect(w1.minimum).toHaveLength(1);
  });

  it('never marks a past week complete just because its dates have passed', () => {
    const data = dataWith({});
    expect(weekStatus(summarizeWeek(data, 1), 3)).toBe('no-activity');
    expect(weekStatus(summarizeWeek(data, 4), 3)).toBe('upcoming');
    expect(weekStatus(summarizeWeek(data, 3), 3)).toBe('current');
  });

  it('marks target met only with three recorded strength sessions', () => {
    const data = dataWith({ workoutSessions: [session('2026-10-05', 'A'), session('2026-10-07', 'B'), session('2026-10-09', 'A')] });
    expect(weekStatus(summarizeWeek(data, 1), 3)).toBe('target-met');
  });
});

describe('rotation and records', () => {
  it('alternates from the last completed full workout', () => {
    expect(nextInRotation([])).toBe('A');
    expect(nextInRotation([session('2026-10-05', 'A')])).toBe('B');
    expect(nextInRotation([session('2026-10-05', 'A'), session('2026-10-07', 'B'), session('2026-10-08', 'minimum')])).toBe('A');
  });

  it('derives personal records from logged sets only', () => {
    const records = personalRecords([
      session('2026-10-05', 'A', { exerciseResults: [{ exerciseId: 'pushups', setsCompleted: 2, repsPerSet: [6, 7], holdDurationSeconds: null, completed: true }] }),
      session('2026-10-07', 'B', { exerciseResults: [{ exerciseId: 'plank', setsCompleted: 2, repsPerSet: [], holdDurationSeconds: 25, completed: true }] }),
      session('2026-10-09', 'A', { exerciseResults: [{ exerciseId: 'pushups', setsCompleted: 1, repsPerSet: [9], holdDurationSeconds: null, completed: true }] }),
    ]);
    expect(records.find((r) => r.exerciseId === 'pushups')).toMatchObject({ bestSet: 9, unit: 'reps', date: '2026-10-09' });
    expect(records.find((r) => r.exerciseId === 'plank')).toMatchObject({ bestSet: 25, unit: 'seconds' });
  });
});
