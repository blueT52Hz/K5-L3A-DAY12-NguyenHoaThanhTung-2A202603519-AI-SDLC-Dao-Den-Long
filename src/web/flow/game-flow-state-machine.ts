// Pure flow state machine: menu -> intro(n) -> playing -> result -> intro(n+1) | dawn.
// A run may start at any night N (level select); it then covers nights N..3 and ends at dawn.
// Loss: retry the same night or go back to menu. Total = sum of won nights' scores in this run.
import type { NightId } from '../../core/types';

export type FlowPhase =
  | { kind: 'menu' }
  | { kind: 'intro'; night: NightId }
  | { kind: 'playing'; night: NightId }
  | { kind: 'result'; night: NightId; won: boolean; nightScore: number }
  | { kind: 'dawn' };

export class GameFlow {
  phase: FlowPhase = { kind: 'menu' };
  private wonScores: Partial<Record<NightId, number>> = {};

  /** Sum of scores of nights won so far (a retried night counts once). */
  get total(): number {
    return Object.values(this.wonScores).reduce((a, b) => a + (b ?? 0), 0);
  }

  /** Number of distinct nights won in this run (for the leaderboard). */
  get nightsWon(): number {
    return Object.keys(this.wonScores).length;
  }

  /** Fresh run starting at `startNight` (default 1): score reset, then that night's intro. */
  startRun(startNight: NightId = 1): void {
    this.wonScores = {};
    this.phase = { kind: 'intro', night: startNight };
  }

  /** Dev-only (?night=N) alias kept for compatibility: same as startRun(n). */
  startAtNight(n: NightId): void {
    this.startRun(n);
  }

  /** Intro screen dismissed: start playing the night. */
  beginNight(): void {
    if (this.phase.kind === 'intro') this.phase = { kind: 'playing', night: this.phase.night };
  }

  /** Night ended (core status won/lost). */
  finishNight(won: boolean, nightScore: number): void {
    if (this.phase.kind !== 'playing') return;
    const night = this.phase.night;
    if (won) this.wonScores[night] = nightScore;
    this.phase = { kind: 'result', night, won, nightScore };
  }

  /** Result screen "continue": next night intro, or dawn after night 3. Loss -> retry. */
  continueFromResult(): void {
    if (this.phase.kind !== 'result') return;
    const { night, won } = this.phase;
    if (!won) this.phase = { kind: 'playing', night };
    else this.phase = night === 3 ? { kind: 'dawn' } : { kind: 'intro', night: (night + 1) as NightId };
  }

  /** Restart the current night (pause menu "Chơi lại Đêm"). */
  retryNight(): void {
    if (this.phase.kind === 'playing') this.phase = { kind: 'playing', night: this.phase.night };
  }

  toMenu(): void {
    this.wonScores = {};
    this.phase = { kind: 'menu' };
  }
}
