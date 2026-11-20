import { InputFormatError } from './errors';
import type { InputFrame } from '../core/types';

export { InputFormatError };
const BOOLS = ['jump', 'interact', 'pulse', 'dash', 'pause'] as const;

/** Validate the inputs file. Frames must have strictly increasing integer ticks. */
export function parseInputs(json: unknown): { tick: number; frame: Partial<InputFrame> }[] {
  const frames = (json as { frames?: unknown } | null)?.frames;
  if (!Array.isArray(frames)) throw new InputFormatError('inputs: "frames" must be an array');
  let last = -1;
  return frames.map((f: Record<string, unknown>, i) => {
    if (typeof f !== 'object' || f === null) throw new InputFormatError(`frame ${i}: not an object`);
    const tick = f.tick;
    if (typeof tick !== 'number' || !Number.isInteger(tick) || tick < 0) throw new InputFormatError(`frame ${i}: bad tick`);
    if (tick <= last) throw new InputFormatError(`frame ${i}: tick must strictly increase`);
    last = tick;
    const frame: Partial<InputFrame> = {};
    if (f.move !== undefined) {
      const mv = f.move;
      if (!Array.isArray(mv) || mv.length !== 2 || mv.some((x) => typeof x !== 'number' || !(x >= -1 && x <= 1))) {
        throw new InputFormatError(`frame ${i}: move must be [x,z] within [-1,1]`);
      }
      frame.move = [mv[0], mv[1]];
    }
    if (f.cam_yaw_deg !== undefined) {
      if (typeof f.cam_yaw_deg !== 'number' || !Number.isFinite(f.cam_yaw_deg)) throw new InputFormatError(`frame ${i}: bad cam_yaw_deg`);
      frame.cam_yaw_deg = f.cam_yaw_deg;
    }
    for (const b of BOOLS) {
      if (f[b] === undefined) continue;
      if (typeof f[b] !== 'boolean') throw new InputFormatError(`frame ${i}: ${b} must be boolean`);
      frame[b] = f[b] as boolean;
    }
    return { tick, frame };
  });
}
