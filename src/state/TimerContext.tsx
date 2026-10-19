import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useTimer, type TimerConfig, type TimerControls, type TimerState } from '../hooks/useTimer';
import { TIMER_STORAGE_KEY } from '../utils/storage';
import { playChime, unlockAudio, vibrate } from '../utils/sound';
import { useAppData } from './AppDataContext';
import { useToast } from './ToastContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatClock } from '../utils/date';

interface TimerApi extends TimerControls {
  /** Starts a timer, asking first if a different one is already running or paused. */
  requestStart: (config: TimerConfig) => void;
  /** True while a countdown is running or paused. */
  isActive: boolean;
}

const TimerContext = createContext<TimerApi | null>(null);

/** One shared countdown for the whole app, so navigating never resets it and two can't run at once. */
export function TimerProvider({ children }: { children: ReactNode }) {
  const { data } = useAppData();
  const { announce } = useToast();
  const soundEnabled = data.settings.soundEnabled;
  const [pending, setPending] = useState<TimerConfig | null>(null);

  const onComplete = useCallback(
    (state: TimerState, lateMs: number) => {
      // Only cue when the completion is fresh; a countdown that ended long ago (e.g. while the tab slept) stays silent.
      if (lateMs < 60_000) {
        if (soundEnabled) playChime();
        vibrate();
      }
      announce(`Timer complete: ${state.label}.`);
    },
    [soundEnabled, announce],
  );

  const timer = useTimer({ onComplete, storageKey: TIMER_STORAGE_KEY });
  const isActive = timer.state.status === 'running' || timer.state.status === 'paused';
  const { start } = timer;

  const requestStart = useCallback(
    (config: TimerConfig) => {
      unlockAudio();
      // Timers from the same source (same tag) replace each other silently, e.g. one rest after another.
      if (isActive && timer.state.tag !== (config.tag ?? null)) {
        setPending(config);
        return;
      }
      start(config);
    },
    [isActive, timer.state.tag, start],
  );

  const api = useMemo<TimerApi>(() => ({ ...timer, requestStart, isActive }), [timer, requestStart, isActive]);

  return (
    <TimerContext.Provider value={api}>
      {children}
      <ConfirmDialog
        open={pending !== null}
        title="Replace the current timer?"
        confirmLabel="Start new timer"
        cancelLabel="Keep current timer"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) start(pending);
          setPending(null);
        }}
      >
        <p>
          “{timer.state.label}” is {timer.state.status} with {formatClock(timer.remainingMs / 1000)} left. Only one timer runs at a time.
        </p>
      </ConfirmDialog>
    </TimerContext.Provider>
  );
}

export function useSharedTimer(): TimerApi {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useSharedTimer must be used inside TimerProvider');
  return ctx;
}
