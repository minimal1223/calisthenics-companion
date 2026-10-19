import { useCallback, useEffect, useRef, useState } from 'react';
import type { TimerKind } from '../types';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface TimerState {
  status: TimerStatus;
  /** Total configured length, including any time added. */
  durationMs: number;
  /** Absolute epoch time the countdown reaches zero. Only set while running. */
  endAt: number | null;
  /** Authoritative remaining time while idle, paused, or completed. */
  remainingMs: number;
  label: string;
  kind: TimerKind;
  /** Optional owner tag, e.g. a mobility movement the timer belongs to. */
  tag: string | null;
  completedAt: number | null;
}

export interface TimerConfig {
  seconds: number;
  label: string;
  kind: TimerKind;
  tag?: string | null;
}

export const MIN_TIMER_SECONDS = 5;
export const MAX_TIMER_SECONDS = 3600;

export const initialTimerState: TimerState = {
  status: 'idle',
  durationMs: 60_000,
  endAt: null,
  remainingMs: 60_000,
  label: 'Rest interval',
  kind: 'rest',
  tag: null,
  completedAt: null,
};

export function clampSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) return MIN_TIMER_SECONDS;
  return Math.min(MAX_TIMER_SECONDS, Math.max(MIN_TIMER_SECONDS, Math.round(seconds)));
}

/* ---------- Pure, timestamp-based transitions (no per-tick decrementing) ---------- */

export function remainingAt(state: TimerState, now: number): number {
  if (state.status === 'running' && state.endAt !== null) return Math.max(0, state.endAt - now);
  return state.remainingMs;
}

export function configureTimer(config: TimerConfig): TimerState {
  const ms = clampSeconds(config.seconds) * 1000;
  return { status: 'idle', durationMs: ms, endAt: null, remainingMs: ms, label: config.label, kind: config.kind, tag: config.tag ?? null, completedAt: null };
}

export function startTimer(config: TimerConfig, now: number): TimerState {
  const s = configureTimer(config);
  return { ...s, status: 'running', endAt: now + s.durationMs };
}

export function runTimer(state: TimerState, now: number): TimerState {
  if (state.status === 'running') return state;
  const remaining = state.status === 'completed' || state.remainingMs <= 0 ? state.durationMs : state.remainingMs;
  return { ...state, status: 'running', endAt: now + remaining, remainingMs: remaining, completedAt: null };
}

export function pauseTimer(state: TimerState, now: number): TimerState {
  if (state.status !== 'running') return state;
  return { ...state, status: 'paused', remainingMs: remainingAt(state, now), endAt: null };
}

export function resetTimer(state: TimerState): TimerState {
  return { ...state, status: 'idle', endAt: null, remainingMs: state.durationMs, completedAt: null };
}

export function addTime(state: TimerState, ms: number, now: number): TimerState {
  if (state.status === 'completed') {
    return { ...state, status: 'running', durationMs: state.durationMs + ms, remainingMs: ms, endAt: now + ms, completedAt: null };
  }
  const durationMs = Math.min(MAX_TIMER_SECONDS * 1000, state.durationMs + ms);
  const added = durationMs - state.durationMs;
  if (state.status === 'running' && state.endAt !== null) return { ...state, durationMs, endAt: state.endAt + added };
  return { ...state, durationMs, remainingMs: state.remainingMs + added };
}

/** Marks the timer completed once its end time has passed. Returns the same object when nothing changed. */
export function tickTimer(state: TimerState, now: number): TimerState {
  if (state.status !== 'running' || state.endAt === null || now < state.endAt) return state;
  return { ...state, status: 'completed', remainingMs: 0, endAt: null, completedAt: state.endAt };
}

/* ---------- Persistence (so a refresh doesn't lose a running timer) ---------- */

function isTimerState(v: unknown): v is TimerState {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    ['idle', 'running', 'paused', 'completed'].includes(s.status as string) &&
    typeof s.durationMs === 'number' &&
    typeof s.remainingMs === 'number' &&
    (s.endAt === null || typeof s.endAt === 'number') &&
    typeof s.label === 'string' &&
    ['exercise', 'rest', 'mobility', 'workout', 'custom'].includes(s.kind as string)
  );
}

function loadTimer(storageKey: string | undefined): TimerState {
  if (!storageKey) return initialTimerState;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return initialTimerState;
    const parsed: unknown = JSON.parse(raw);
    if (!isTimerState(parsed)) return initialTimerState;
    const restored: TimerState = { ...parsed, tag: parsed.tag ?? null, completedAt: parsed.completedAt ?? null };
    // A countdown that ended while the app was closed is shown as completed, without a late chime.
    return tickTimer(restored, Date.now());
  } catch {
    return initialTimerState;
  }
}

export interface UseTimerOptions {
  /** Called once when a running countdown reaches zero. `lateMs` is how long ago it actually ended. */
  onComplete?: (state: TimerState, lateMs: number) => void;
  storageKey?: string;
  tickMs?: number;
}

export interface TimerControls {
  state: TimerState;
  remainingMs: number;
  start: (config: TimerConfig) => void;
  configure: (config: TimerConfig) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  add: (seconds: number) => void;
}

/**
 * Countdown driven by absolute timestamps: the remaining time is always `endAt - Date.now()`,
 * so throttled or delayed callbacks (background tabs, slow renders) never make it drift.
 * Only one interval exists at a time and it is cleared whenever the timer stops running.
 */
export function useTimer({ onComplete, storageKey, tickMs = 250 }: UseTimerOptions = {}): TimerControls {
  const [state, setState] = useState<TimerState>(() => loadTimer(storageKey));
  const [now, setNow] = useState(() => Date.now());
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* timer still works in memory */
    }
  }, [state, storageKey]);

  // Single ticking interval while running; recomputes immediately when the tab becomes visible.
  useEffect(() => {
    if (state.status !== 'running') return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      setState((s) => tickTimer(s, t));
    };
    tick();
    const id = window.setInterval(tick, tickMs);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [state.status, tickMs]);

  // Fire completion side effects exactly once per completion.
  const announcedFor = useRef<number | null>(state.status === 'completed' ? state.completedAt : null);
  useEffect(() => {
    if (state.status !== 'completed' || state.completedAt === null) return;
    if (announcedFor.current === state.completedAt) return;
    announcedFor.current = state.completedAt;
    onCompleteRef.current?.(state, Date.now() - state.completedAt);
  }, [state]);

  const start = useCallback((config: TimerConfig) => setState(startTimer(config, Date.now())), []);
  const configure = useCallback((config: TimerConfig) => setState(configureTimer(config)), []);
  const pause = useCallback(() => setState((s) => pauseTimer(s, Date.now())), []);
  const resume = useCallback(() => setState((s) => runTimer(s, Date.now())), []);
  const reset = useCallback(() => setState((s) => resetTimer(s)), []);
  const add = useCallback((seconds: number) => setState((s) => addTime(s, seconds * 1000, Date.now())), []);

  // `now` can briefly predate a fresh start; never show more than the configured duration.
  const remainingMs = Math.min(state.durationMs, remainingAt(state, now));

  return { state, remainingMs, start, configure, pause, resume, reset, add };
}
