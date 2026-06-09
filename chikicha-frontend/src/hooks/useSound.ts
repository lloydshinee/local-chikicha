import { useCallback, useRef } from 'react';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.1
) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available
  }
}

export function useSound() {
  const lastDropTime = useRef(0);

  const playDrop = useCallback(() => {
    const now = Date.now();
    if (now - lastDropTime.current < 50) return;
    lastDropTime.current = now;
    playTone(200, 0.1, 'sine', 0.08);
  }, []);

  const playPass = useCallback(() => {
    playTone(800, 0.2, 'sine', 0.06);
  }, []);

  const playCountdownTick = useCallback(() => {
    playTone(1000, 0.05, 'sine', 0.05);
  }, []);

  const playCountdownFinal = useCallback(() => {
    playTone(1500, 0.1, 'sine', 0.08);
  }, []);

  const playGameOver = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.6);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio not available
    }
  }, []);

  return {
    playDrop,
    playPass,
    playCountdownTick,
    playCountdownFinal,
    playGameOver,
  };
}
