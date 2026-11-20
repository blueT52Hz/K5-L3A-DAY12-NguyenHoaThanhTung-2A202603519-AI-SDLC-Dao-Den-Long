// Fixed 60Hz simulation step with per-frame render.
const STEP_S = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;

export function startLoop(update: () => void, render: (dtS: number) => void): void {
  let last = performance.now();
  let acc = 0;
  const frame = (now: number): void => {
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    acc += dt;
    let steps = 0;
    while (acc >= STEP_S && steps < MAX_STEPS_PER_FRAME) {
      update();
      acc -= STEP_S;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) acc = 0; // drop backlog after a long stall
    render(dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
