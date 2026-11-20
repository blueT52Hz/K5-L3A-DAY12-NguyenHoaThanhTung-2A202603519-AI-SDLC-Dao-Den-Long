// Procedural WebAudio voices. Each fn schedules a short sound on `dest` at time `t`.
import type { SoundId } from './event-to-sound';

function tone(ctx: AudioContext, dest: AudioNode, t: number, freq: number, dur: number,
  type: OscillatorType = 'sine', gain = 0.3, slideTo?: number): void {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(ctx: AudioContext, dest: AudioNode, t: number, dur: number, freq: number, gain: number): void {
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  src.buffer = buf;
  f.type = 'bandpass';
  f.frequency.value = freq;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(t);
}

const VOICES: Record<SoundId, (c: AudioContext, d: AudioNode, t: number) => void> = {
  pickup: (c, d, t) => tone(c, d, t, 880, 0.12, 'sine', 0.25, 1320),
  light: (c, d, t) => { [523, 659, 784, 1047].forEach((f, i) => tone(c, d, t + i * 0.08, f, 0.5, 'triangle', 0.22)); },
  pulse: (c, d, t) => { tone(c, d, t, 300, 0.45, 'sine', 0.3, 900); noise(c, d, t, 0.3, 2000, 0.08); },
  hit: (c, d, t) => { tone(c, d, t, 180, 0.3, 'sawtooth', 0.3, 60); noise(c, d, t, 0.2, 400, 0.2); },
  jump: (c, d, t) => tone(c, d, t, 320, 0.16, 'square', 0.12, 640),
  dash: (c, d, t) => noise(c, d, t, 0.22, 1500, 0.22),
  win: (c, d, t) => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, d, t + i * 0.12, f, 0.6, 'triangle', 0.25)); },
  lose: (c, d, t) => { [392, 330, 262, 196].forEach((f, i) => tone(c, d, t + i * 0.18, f, 0.6, 'sawtooth', 0.15)); },
  shade: (c, d, t) => tone(c, d, t, 110, 0.7, 'sawtooth', 0.2, 55),
  tick: (c, d, t) => tone(c, d, t, 1000, 0.08, 'square', 0.15),
  wind: (c, d, t) => noise(c, d, t, 1.2, 600, 0.2),
  charm: (c, d, t) => { tone(c, d, t, 700, 0.3, 'triangle', 0.25, 1400); tone(c, d, t + 0.1, 1050, 0.3, 'sine', 0.2); },
};

export function playVoice(ctx: AudioContext, dest: AudioNode, id: SoundId): void {
  VOICES[id](ctx, dest, ctx.currentTime);
}

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880];

/** Night ambience: slow detuned pad + sparse bells. Returns a stop function. */
export function startNightMusic(ctx: AudioContext, dest: AudioNode): () => void {
  const bus = ctx.createGain();
  bus.gain.value = 0.5;
  bus.connect(dest);
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 600;
  const padGain = ctx.createGain();
  padGain.gain.value = 0.08;
  filt.connect(padGain).connect(bus);
  const oscs = [110, 164.81, 220, 277.18].map((f, i) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.detune.value = (i - 1.5) * 6;
    o.connect(filt);
    o.start();
    return o;
  });
  let timer = 0;
  const bell = (): void => {
    const f = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
    tone(ctx, bus, ctx.currentTime, f, 2.2, 'sine', 0.07);
    timer = window.setTimeout(bell, 2500 + Math.random() * 3500);
  };
  timer = window.setTimeout(bell, 1500);
  return () => {
    window.clearTimeout(timer);
    oscs.forEach((o) => { try { o.stop(); } catch { /* already stopped */ } });
    bus.disconnect();
  };
}
