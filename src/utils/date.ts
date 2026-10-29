import type { LocalDate } from '../types';
import { PLAN_WEEKS } from '../data/plan';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Formats a Date as a local calendar date (never via toISOString, which is UTC). */
export function toLocalDate(date: Date): LocalDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function today(now: Date = new Date()): LocalDate {
  return toLocalDate(now);
}

export function isValidLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== 'string') return false;
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

/** Parses `YYYY-MM-DD` as local midnight. */
export function parseLocalDate(value: LocalDate): Date {
  const m = ISO_DATE.exec(value);
  if (!m) throw new Error(`Invalid local date: ${value}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Day number that is immune to DST: counts calendar days, not elapsed milliseconds. */
function dayNumber(value: LocalDate): number {
  const m = ISO_DATE.exec(value);
  if (!m) throw new Error(`Invalid local date: ${value}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / MS_PER_DAY;
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round(dayNumber(to) - dayNumber(from));
}

export function addDays(value: LocalDate, days: number): LocalDate {
  const d = parseLocalDate(value);
  d.setDate(d.getDate() + days);
  return toLocalDate(d);
}

export function dayOfWeek(value: LocalDate): number {
  return parseLocalDate(value).getDay();
}

/** The Monday on or before `date`. */
export function mondayOf(date: LocalDate): LocalDate {
  const dow = dayOfWeek(date);
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

/**
 * Unclamped plan week for a date. Plan weeks run Monday–Sunday, matching the weekly
 * schedule (Mon A · Wed B · Fri A/B); week 1 is the Monday–Sunday week containing the
 * plan start date. Returns 0 or less for earlier weeks.
 */
export function planWeekOf(date: LocalDate, planStartDate: LocalDate): number {
  return Math.floor(daysBetween(mondayOf(planStartDate), date) / 7) + 1;
}

/** Current plan week, clamped to 1..12. Advances with calendar days, not with workouts done. */
export function currentPlanWeek(todayDate: LocalDate, planStartDate: LocalDate): number {
  const week = planWeekOf(todayDate, planStartDate);
  return Math.min(PLAN_WEEKS, Math.max(1, week));
}

export function planWeekRange(week: number, planStartDate: LocalDate): { start: LocalDate; end: LocalDate } {
  const start = addDays(mondayOf(planStartDate), (week - 1) * 7);
  return { start, end: addDays(start, 6) };
}

/** Monday-start calendar week containing `date`. */
export function calendarWeekDates(date: LocalDate): LocalDate[] {
  const monday = mondayOf(date);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function formatDate(value: LocalDate, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
  if (!isValidLocalDate(value)) return value;
  return parseLocalDate(value).toLocaleDateString(undefined, options);
}

export function formatLongDate(value: LocalDate): string {
  return formatDate(value, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return sec > 0 && m < 10 ? `${m} min ${sec} s` : `${m} min`;
  return `${sec} s`;
}

/** MM:SS (or H:MM:SS over an hour) for countdown displays. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
