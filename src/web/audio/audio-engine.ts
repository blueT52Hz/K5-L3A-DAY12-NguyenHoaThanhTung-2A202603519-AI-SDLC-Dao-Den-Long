import { playVoice, startNightMusic } from './procedural-sounds';
import type { SoundId } from './event-to-sound';

/** WebAudio wrapper: context is created on the first user gesture; master gain follows settings. */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private stopMusic: (() => void) | null = null;
  private volume = 0.7;
  private wantMusic = false;

  /** Call once; the first click/keydown creates (or resumes) the AudioContext. */
  init(): void {
    const unlock = (): void => {
      if (!this.ctx) {
        try {
          const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          this.ctx = new Ctor();
          this.master = this.ctx.createGain();
          this.master.gain.value = this.volume;
          this.master.connect(this.ctx.destination);
        } catch { return; }
      }
      void this.ctx.resume();
      if (this.wantMusic && !this.stopMusic) this.stopMusic = startNightMusic(this.ctx, this.master!);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  /** volume 0-100 from settings. */
  setVolume(v: number): void {
    this.volume = Math.min(100, Math.max(0, v)) / 100;
    if (this.master) this.master.gain.value = this.volume;
  }

  play(id: SoundId): void {
    if (this.ctx && this.master && this.ctx.state === 'running') playVoice(this.ctx, this.master, id);
  }

  setMusic(on: boolean): void {
    this.wantMusic = on;
    if (on && this.ctx && this.master && !this.stopMusic) this.stopMusic = startNightMusic(this.ctx, this.master);
    if (!on && this.stopMusic) { this.stopMusic(); this.stopMusic = null; }
  }
}
