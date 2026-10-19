import { useEffect, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { currentPlanWeek, planWeekOf, today } from '../utils/date';
import { PLAN_WEEKS, phaseForWeek, type Phase } from '../data/plan';
import type { LocalDate } from '../types';

/** Today's local date, refreshed every minute so the app rolls over at midnight. */
export function useToday(): LocalDate {
  const [value, setValue] = useState(today);
  useEffect(() => {
    const id = window.setInterval(() => setValue(today()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return value;
}

export interface PlanInfo {
  todayDate: LocalDate;
  /** Clamped 1..12. */
  currentWeek: number;
  /** Unclamped week (≤0 before start, >12 after the plan). */
  rawWeek: number;
  phase: Phase;
  beforeStart: boolean;
  afterEnd: boolean;
}

export function usePlan(): PlanInfo {
  const { data } = useAppData();
  const todayDate = useToday();
  const start = data.settings.planStartDate;
  const rawWeek = planWeekOf(todayDate, start);
  const currentWeek = currentPlanWeek(todayDate, start);
  return {
    todayDate,
    currentWeek,
    rawWeek,
    phase: phaseForWeek(currentWeek),
    beforeStart: todayDate < start,
    afterEnd: rawWeek > PLAN_WEEKS,
  };
}
