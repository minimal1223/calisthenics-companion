let audioContext: AudioContext | null = null;

type AudioContextCtor = typeof AudioContext;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    audioContext ??= new Ctor();
    return audioContext;
  } catch {
    return null;
  }
}

/**
 * Browsers only allow audio after a user gesture. Call this from click handlers
 * (e.g. Start) so the completion chime is permitted later.
 */
export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
}

/** Plays a soft three-note chime. Returns false when audio is unavailable. */
export function playChime(): boolean {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running') return false;
  try {
    const start = ctx.currentTime;
    [660, 880, 990].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = start + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
    return true;
  } catch {
    return false;
  }
}

export function vibrate(pattern: number[] = [200, 100, 200]): boolean {
  try {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' ? navigator.vibrate(pattern) : false;
  } catch {
    return false;
  }
}
