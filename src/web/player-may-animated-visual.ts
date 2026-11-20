import type * as THREE from 'three';
import type { Player } from '../core/types';
import { createMayCharacter, type MayCharacter } from './decor/may-character-factory';

/** Airborne: limbs keep moving but at a slower cadence so a jump does not look like running in place. */
const AIRBORNE_SPEED_SCALE = 0.35;

/**
 * Mây as seen in the game: the rigged decor character whose arms/legs swing with the player's
 * horizontal speed (player.vel XZ is real displacement per tick in m/s, so dash and wind push
 * naturally speed up the cycle). Position/facing are still set by SceneSync exactly as before.
 */
export class PlayerMayAnimatedVisual {
  private character: MayCharacter;
  private speedMps = 0;

  constructor(withLight: boolean) {
    this.character = createMayCharacter({ withLight });
  }

  get group(): THREE.Group {
    return this.character.group;
  }

  /** Latch the latest simulated horizontal speed (called from SceneSync.sync). */
  setFromPlayer(p: Player): void {
    const speed = Math.hypot(p.vel[0], p.vel[2]);
    this.speedMps = p.grounded ? speed : speed * AIRBORNE_SPEED_SCALE;
  }

  /** Render-rate animation step. */
  animate(dtS: number): void {
    this.character.update(dtS, this.speedMps);
  }

  dispose(): void {
    this.character.dispose();
  }
}
