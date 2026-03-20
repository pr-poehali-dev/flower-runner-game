import { useEffect, useRef } from 'react';

// Романтическая медленная мелодия — лирика, синус-волна
// Ноты: [частота_Гц, длительность_сек]
const MELODY: [number, number][] = [
  // Вступление — нежное
  [0, 0.3],
  [392.00, 0.5], [440.00, 0.5], [493.88, 0.8],
  [0, 0.2],
  [440.00, 0.5], [392.00, 0.5], [349.23, 1.0],
  [0, 0.3],
  // Фраза 2
  [392.00, 0.5], [440.00, 0.5], [523.25, 0.8],
  [0, 0.2],
  [493.88, 0.5], [440.00, 0.5], [392.00, 1.0],
  [0, 0.3],
  // Фраза 3 — нарастание
  [349.23, 0.4], [392.00, 0.4], [440.00, 0.4], [493.88, 0.8],
  [0, 0.2],
  [523.25, 0.5], [493.88, 0.5], [440.00, 1.0],
  [0, 0.3],
  // Кульминация
  [523.25, 0.5], [587.33, 0.5], [659.25, 1.0],
  [0, 0.2],
  [587.33, 0.5], [523.25, 0.5], [493.88, 0.5], [440.00, 1.2],
  [0, 0.3],
  // Возврат
  [392.00, 0.5], [440.00, 0.5], [493.88, 0.8],
  [0, 0.2],
  [440.00, 0.4], [415.30, 0.4], [392.00, 1.5],
  [0, 0.5],
];

// Арпеджио — романтическое сопровождение
const ARPEGGIO: [number, number][] = [
  [261.63, 0.25], [329.63, 0.25], [392.00, 0.25], [329.63, 0.25],
  [246.94, 0.25], [311.13, 0.25], [369.99, 0.25], [311.13, 0.25],
  [220.00, 0.25], [277.18, 0.25], [349.23, 0.25], [277.18, 0.25],
  [196.00, 0.25], [246.94, 0.25], [293.66, 0.25], [246.94, 0.25],
  [261.63, 0.25], [329.63, 0.25], [392.00, 0.25], [329.63, 0.25],
  [293.66, 0.25], [369.99, 0.25], [440.00, 0.25], [369.99, 0.25],
  [261.63, 0.25], [329.63, 0.25], [392.00, 0.25], [329.63, 0.25],
  [246.94, 0.25], [311.13, 0.25], [369.99, 0.25], [311.13, 0.25],
  [261.63, 0.25], [329.63, 0.25], [392.00, 0.25], [329.63, 0.25],
  [246.94, 0.25], [311.13, 0.25], [369.99, 0.25], [311.13, 0.25],
  [220.00, 0.25], [277.18, 0.25], [349.23, 0.25], [277.18, 0.25],
  [196.00, 0.25], [246.94, 0.25], [293.66, 0.25], [246.94, 0.25],
];

// Тихий бас
const BASS: [number, number][] = [
  [65.41, 1.0], [0, 1.0],
  [61.74, 1.0], [0, 1.0],
  [55.00, 1.0], [0, 1.0],
  [49.00, 1.0], [0, 1.0],
  [65.41, 1.0], [0, 1.0],
  [73.42, 1.0], [0, 1.0],
  [65.41, 1.0], [0, 1.0],
  [61.74, 1.0], [0, 1.0],
];

function playNote(
  ctx: AudioContext,
  freq: number,
  dur: number,
  startTime: number,
  gainVal: number,
  type: OscillatorType,
  attack = 0.08,
  release = 0.3,
) {
  if (freq === 0) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  // Небольшой реверб-эффект через delay
  const delay = ctx.createDelay(0.5);
  const delayGain = ctx.createGain();
  delay.delayTime.value = 0.25;
  delayGain.gain.value = 0.18;

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(gainVal, startTime + attack);
  gain.gain.setValueAtTime(gainVal, startTime + dur - release);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.connect(delay);
  delay.connect(delayGain);
  delayGain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + dur + 0.05);
}

function scheduleSequence(
  ctx: AudioContext,
  notes: [number, number][],
  gainVal: number,
  type: OscillatorType,
  startTime: number,
  attack?: number,
  release?: number,
): number {
  let t = startTime;
  notes.forEach(([freq, dur]) => {
    if (freq > 0) playNote(ctx, freq, dur, t, gainVal, type, attack, release);
    t += dur;
  });
  return t;
}

export function useGameMusic(volume: number, playing: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const schedulerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      // Мелодия — синус, нежно
      const melodyEnd = scheduleSequence(ctx, MELODY, vol * 0.18, 'sine', startAt, 0.1, 0.4);
      // Арпеджио — треугольная волна, тихо
      scheduleSequence(ctx, ARPEGGIO, vol * 0.07, 'triangle', startAt, 0.02, 0.2);
      // Бас — синус, глубоко
      scheduleSequence(ctx, BASS, vol * 0.1, 'sine', startAt, 0.15, 0.5);

      const loopDuration = (melodyEnd - startAt) * 1000;
      schedulerRef.current = setTimeout(() => {
        if (ctxRef.current) scheduleLoop(ctx.currentTime + 0.05);
      }, loopDuration - 400);
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
