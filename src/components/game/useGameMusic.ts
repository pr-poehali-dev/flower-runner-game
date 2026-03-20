import { useEffect, useRef } from 'react';

// 8-bit мелодия, вдохновлённая романтическим прогулочным настроением
// Ноты: [частота_Гц, длительность_сек]
const MELODY: [number, number][] = [
  // Фраза 1
  [523.25, 0.18], [587.33, 0.18], [659.25, 0.18], [698.46, 0.36],
  [659.25, 0.18], [587.33, 0.18], [523.25, 0.36],
  [440.00, 0.18], [493.88, 0.18], [523.25, 0.18], [587.33, 0.36],
  [523.25, 0.18], [493.88, 0.18], [440.00, 0.54],
  // Фраза 2
  [392.00, 0.18], [440.00, 0.18], [493.88, 0.18], [523.25, 0.36],
  [493.88, 0.18], [440.00, 0.18], [392.00, 0.36],
  [349.23, 0.18], [392.00, 0.18], [440.00, 0.18], [493.88, 0.36],
  [440.00, 0.18], [392.00, 0.18], [349.23, 0.54],
  // Фраза 3 — подъём
  [523.25, 0.18], [587.33, 0.18], [659.25, 0.18], [783.99, 0.36],
  [698.46, 0.18], [659.25, 0.18], [587.33, 0.36],
  [659.25, 0.18], [587.33, 0.18], [523.25, 0.18], [493.88, 0.36],
  [440.00, 0.54],
  // Финал
  [523.25, 0.18], [587.33, 0.18], [659.25, 0.18], [698.46, 0.18],
  [783.99, 0.36], [698.46, 0.18], [659.25, 0.36],
  [587.33, 0.18], [523.25, 0.36], [493.88, 0.18], [440.00, 0.54],
  [523.25, 0.72],
];

// Простой бас-аккомпанемент
const BASS: [number, number][] = [
  [130.81, 0.36], [0, 0.36], [130.81, 0.18], [0, 0.18],
  [110.00, 0.36], [0, 0.36], [110.00, 0.18], [0, 0.18],
  [98.00,  0.36], [0, 0.36], [98.00,  0.18], [0, 0.18],
  [87.31,  0.36], [0, 0.36], [87.31,  0.18], [0, 0.18],
];

function playSequence(
  ctx: AudioContext,
  notes: [number, number][],
  gainVal: number,
  type: OscillatorType,
  startTime: number,
  loop = false,
): number {
  let t = startTime;
  const schedule = () => {
    const loopStart = t;
    notes.forEach(([freq, dur]) => {
      if (freq === 0) { t += dur; return; }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(gainVal, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
      t += dur;
    });
    return t - loopStart;
  };
  schedule();
  return t;
}

export function useGameMusic(volume: number, playing: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const schedulerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loopTimeRef = useRef(0);

  useEffect(() => {
    if (!playing) {
      ctxRef.current?.close();
      ctxRef.current = null;
      if (schedulerRef.current) clearTimeout(schedulerRef.current);
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    ctxRef.current = ctx;

    const vol = volume / 100;

    const scheduleLoop = (startAt: number) => {
      const melodyEnd = playSequence(ctx, MELODY, vol * 0.22, 'square', startAt);
      playSequence(ctx, BASS, vol * 0.12, 'sawtooth', startAt);

      // Percussion (kick + hat pattern)
      const beatDur = 0.18;
      let bt = startAt;
      for (let i = 0; i < 32; i++) {
        // Kick
        const kick = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(160, bt);
        kick.frequency.exponentialRampToValueAtTime(40, bt + 0.08);
        kickGain.gain.setValueAtTime(vol * 0.4, bt);
        kickGain.gain.exponentialRampToValueAtTime(0.001, bt + 0.1);
        kick.connect(kickGain);
        kickGain.connect(ctx.destination);
        kick.start(bt);
        kick.stop(bt + 0.1);

        // Hi-hat every half beat
        const hat = ctx.createOscillator();
        const hatGain = ctx.createGain();
        hat.type = 'square';
        hat.frequency.setValueAtTime(8000, bt + beatDur * 0.5);
        hatGain.gain.setValueAtTime(vol * 0.05, bt + beatDur * 0.5);
        hatGain.gain.exponentialRampToValueAtTime(0.001, bt + beatDur * 0.5 + 0.04);
        hat.connect(hatGain);
        hatGain.connect(ctx.destination);
        hat.start(bt + beatDur * 0.5);
        hat.stop(bt + beatDur * 0.5 + 0.04);

        bt += beatDur * 2;
      }

      const loopDuration = (melodyEnd - startAt) * 1000;
      schedulerRef.current = setTimeout(() => {
        if (ctxRef.current) scheduleLoop(ctx.currentTime + 0.05);
      }, loopDuration - 300);
    };

    scheduleLoop(ctx.currentTime + 0.1);

    return () => {
      ctx.close();
      if (schedulerRef.current) clearTimeout(schedulerRef.current);
    };
  }, [playing, volume]);

  useEffect(() => {
    return () => {
      ctxRef.current?.close();
      if (schedulerRef.current) clearTimeout(schedulerRef.current);
    };
  }, []);
}
