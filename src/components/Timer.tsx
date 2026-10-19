import { Pause, Play, Plus, RotateCcw, BellRing } from 'lucide-react';
import { useSharedTimer } from '../state/TimerContext';
import { formatClock } from '../utils/date';
import { unlockAudio } from '../utils/sound';
import type { TimerStatus } from '../hooks/useTimer';

const STATUS_TEXT: Record<TimerStatus, string> = {
  idle: 'Ready',
  running: 'Running',
  paused: 'Paused',
  completed: 'Complete',
};

interface TimerFaceProps {
  size?: 'large' | 'compact';
}

/** Large MM:SS countdown with a progress ring, purpose label, and state. */
export function TimerFace({ size = 'large' }: TimerFaceProps) {
  const { state, remainingMs } = useSharedTimer();
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const fraction = state.durationMs > 0 ? remainingMs / state.durationMs : 0;
  const seconds = remainingMs / 1000;

  return (
    <div className={`timer-face timer-face--${size} timer-face--${state.status}`}>
      <svg className="timer-ring" viewBox="0 0 200 200" aria-hidden>
        <circle className="timer-ring__track" cx="100" cy="100" r={radius} />
        <circle
          className="timer-ring__progress"
          cx="100"
          cy="100"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
        />
      </svg>
      <div className="timer-face__center">
        <span className="timer-face__label">{state.label}</span>
        <span className="timer-face__time num" role="timer" aria-label={`${formatClock(seconds)} remaining`}>
          {formatClock(seconds)}
        </span>
        <span className={`timer-face__status status--${state.status}`}>
          {state.status === 'completed' && <BellRing size={14} aria-hidden />}
          {STATUS_TEXT[state.status]}
        </span>
      </div>
    </div>
  );
}

/** Start / Pause / Resume / Reset / +15 s controls for the shared timer. */
export function TimerControlsBar({ compact = false }: { compact?: boolean }) {
  const { state, pause, resume, reset, add } = useSharedTimer();
  const iconSize = compact ? 18 : 20;

  return (
    <div className={`timer-controls${compact ? ' timer-controls--compact' : ''}`}>
      {state.status === 'running' ? (
        <button type="button" className="button button--primary button--lg" onClick={pause}>
          <Pause size={iconSize} aria-hidden /> Pause
        </button>
      ) : (
        <button
          type="button"
          className="button button--primary button--lg"
          onClick={() => {
            unlockAudio();
            resume();
          }}
        >
          <Play size={iconSize} aria-hidden />
          {state.status === 'paused' ? 'Resume' : state.status === 'completed' ? 'Restart' : 'Start'}
        </button>
      )}
      <button type="button" className="button button--secondary" onClick={reset} disabled={state.status === 'idle' && state.remainingMs === state.durationMs}>
        <RotateCcw size={iconSize} aria-hidden /> Reset
      </button>
      <button type="button" className="button button--secondary" onClick={() => add(15)} aria-label="Add 15 seconds">
        <Plus size={iconSize} aria-hidden /> 15 s
      </button>
    </div>
  );
}

/** Small persistent timer shown on other screens while a countdown is active or just finished. */
export function MiniTimer({ onOpen }: { onOpen: () => void }) {
  const { state, remainingMs, pause, resume, reset } = useSharedTimer();
  if (state.status === 'idle') return null;
  return (
    <div className={`mini-timer mini-timer--${state.status}`} role="region" aria-label="Active timer">
      <button type="button" className="mini-timer__main" onClick={onOpen} aria-label={`Open timer: ${state.label}, ${formatClock(remainingMs / 1000)} ${STATUS_TEXT[state.status].toLowerCase()}`}>
        <span className="mini-timer__time num">{state.status === 'completed' ? 'Done' : formatClock(remainingMs / 1000)}</span>
        <span className="mini-timer__label">{state.label}</span>
      </button>
      {state.status === 'running' && (
        <button type="button" className="icon-button" onClick={pause} aria-label="Pause timer">
          <Pause size={18} aria-hidden />
        </button>
      )}
      {state.status === 'paused' && (
        <button type="button" className="icon-button" onClick={resume} aria-label="Resume timer">
          <Play size={18} aria-hidden />
        </button>
      )}
      <button type="button" className="icon-button" onClick={reset} aria-label={state.status === 'completed' ? 'Dismiss timer' : 'Reset timer'}>
        <RotateCcw size={18} aria-hidden />
      </button>
    </div>
  );
}
