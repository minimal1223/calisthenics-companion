import { describe, expect, it } from 'vitest';
import { addDays, calendarWeekDates, currentPlanWeek, daysBetween, formatClock, isValidLocalDate, planWeekOf, planWeekRange, toLocalDate } from '../utils/date';

describe('local dates', () => {
  it('formats from local components, not UTC', () => {
    // 23:30 local time must stay on the same local day regardless of the UTC offset.
    expect(toLocalDate(new Date(2026, 9, 19, 23, 30))).toBe('2026-10-19');
    expect(toLocalDate(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });

  it('counts calendar days across DST changes and month/year boundaries', () => {
    expect(daysBetween('2026-03-01', '2026-03-15')).toBe(14); // spans US DST start
    expect(daysBetween('2026-10-20', '2026-11-03')).toBe(14); // spans US/EU DST end
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
    expect(daysBetween('2026-01-10', '2026-01-03')).toBe(-7);
    expect(addDays('2026-02-27', 2)).toBe('2026-03-01');
  });

  it('validates real calendar dates only', () => {
    expect(isValidLocalDate('2026-02-28')).toBe(true);
    expect(isValidLocalDate('2026-02-30')).toBe(false);
    expect(isValidLocalDate('2026-2-3')).toBe(false);
    expect(isValidLocalDate(20260101)).toBe(false);
  });

  it('builds a Monday-start calendar week', () => {
    const week = calendarWeekDates('2026-10-18'); // a Sunday
    expect(week[0]).toBe('2026-10-12');
    expect(week[6]).toBe('2026-10-18');
  });

  it('formats countdowns as MM:SS, rounding partial seconds up', () => {
    expect(formatClock(59.2)).toBe('01:00');
    expect(formatClock(5)).toBe('00:05');
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(3600)).toBe('1:00:00');
  });
});

describe('plan week', () => {
  const start = '2026-10-05';

  it('starts week 1 on the plan start date and advances every 7 calendar days', () => {
    expect(currentPlanWeek('2026-10-05', start)).toBe(1);
    expect(currentPlanWeek('2026-10-11', start)).toBe(1);
    expect(currentPlanWeek('2026-10-12', start)).toBe(2);
    expect(currentPlanWeek('2026-10-19', start)).toBe(3);
  });

  it('runs plan weeks Monday–Sunday even when the plan starts mid-week', () => {
    const tuesdayStart = '2026-10-20';
    expect(planWeekOf('2026-10-19', tuesdayStart)).toBe(1); // Monday of the start week
    expect(planWeekOf('2026-10-25', tuesdayStart)).toBe(1); // Sunday
    expect(planWeekOf('2026-10-26', tuesdayStart)).toBe(2); // next Monday
    expect(planWeekOf('2026-11-01', tuesdayStart)).toBe(2);
    expect(planWeekRange(2, tuesdayStart)).toEqual({ start: '2026-10-26', end: '2026-11-01' });
  });

  it('clamps to 1..12', () => {
    expect(currentPlanWeek('2026-09-01', start)).toBe(1);
    expect(planWeekOf('2026-09-28', start)).toBe(0);
    expect(currentPlanWeek('2027-06-01', start)).toBe(12);
  });
});
