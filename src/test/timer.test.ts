import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { addTime, pauseTimer, remainingAt, runTimer, startTimer, tickTimer, useTimer, clampSeconds } from '../hooks/useTimer';

describe('timer transitions (timestamp-based)', () => {
  const t0 = 1_000_000;

  it('derives remaining time from the end timestamp', () => {
    const s = startTimer({ seconds: 60, label: 'Rest', kind: 'rest' }, t0);
    expect(remainingAt(s, t0 + 15_000)).toBe(45_000);
    // A callback delayed by 10 s still reports the true remaining time.
    expect(remainingAt(s, t0 + 25_000)).toBe(35_000);
  });

  it('pauses and resumes without losing or gaining time', () => {
    let s = startTimer({ seconds: 30, label: 'Rest', kind: 'rest' }, t0);
    s = pauseTimer(s, t0 + 10_000);
    expect(s.status).toBe('paused');
    expect(remainingAt(s, t0 + 60_000)).toBe(20_000); // paused time doesn't count
    s = runTimer(s, t0 + 60_000);
    expect(remainingAt(s, t0 + 65_000)).toBe(15_000);
  });

  it('adds 15 seconds to a running timer', () => {
    let s = startTimer({ seconds: 30, label: 'Rest', kind: 'rest' }, t0);
    s = addTime(s, 15_000, t0 + 5_000);
    expect(remainingAt(s, t0 + 5_000)).toBe(40_000);
    expect(s.durationMs).toBe(45_000);
  });

  it('completes once the end time passes', () => {
    const s = startTimer({ seconds: 5, label: 'Hold', kind: 'exercise' }, t0);
    expect(tickTimer(s, t0 + 4_999)).toBe(s);
    const done = tickTimer(s, t0 + 5_000);
    expect(done.status).toBe('completed');
    expect(done.remainingMs).toBe(0);
  });

  it('clamps durations to 5 s – 60 min', () => {
    expect(clampSeconds(1)).toBe(5);
    expect(clampSeconds(99_999)).toBe(3600);
  });
});

describe('useTimer hook', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down, pauses, resumes, resets and fires completion exactly once', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T10:00:00'));
    const onComplete = vi.fn();
    const { result } = renderHook(() => useTimer({ onComplete }));

    act(() => result.current.start({ seconds: 10, label: 'Rest', kind: 'rest' }));
    act(() => vi.advanceTimersByTime(4_000));
    expect(Math.round(result.current.remainingMs / 1000)).toBe(6);

    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(30_000));
    expect(Math.round(result.current.remainingMs / 1000)).toBe(6);

    act(() => result.current.resume());
    act(() => vi.advanceTimersByTime(6_500));
    expect(result.current.state.status).toBe('completed');
    expect(onComplete).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(5_000));
    expect(onComplete).toHaveBeenCalledTimes(1);

    act(() => result.current.reset());
    expect(result.current.state.status).toBe('idle');
    expect(result.current.remainingMs).toBe(10_000);
  });

  it('stays accurate when the clock jumps (throttled background tab)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T10:00:00'));
    const { result } = renderHook(() => useTimer());
    act(() => result.current.start({ seconds: 60, label: 'Rest', kind: 'rest' }));
    // Simulate the system clock moving 40 s while no interval callbacks ran.
    act(() => {
      vi.setSystemTime(new Date('2026-10-19T10:00:40'));
      vi.advanceTimersByTime(250);
    });
    expect(Math.round(result.current.remainingMs / 1000)).toBe(20);
  });
});
