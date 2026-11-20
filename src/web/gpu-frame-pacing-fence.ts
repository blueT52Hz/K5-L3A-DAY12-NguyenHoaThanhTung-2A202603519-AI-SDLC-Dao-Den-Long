import type * as THREE from 'three';

/**
 * Keep at most one rendered frame queued on the GPU.
 *
 * Without vsync (bench: --disable-gpu-vsync --disable-frame-rate-limit) and on a GPU-bound machine, Chrome lets
 * the page run many frames ahead of the GPU until the WebGL command buffer is full, then blocks one
 * requestAnimationFrame for 100-200 ms (trace: CommandBufferHelper::WaitForAvailableEntries). Averages look fine
 * but the 1% low collapses. Here a fence is inserted after every scene render; before the next render starts, if
 * that fence has not signalled yet, we wait for the GPU (gl.finish) so new commands never pile up behind it.
 * Every frame is still fully rendered; only the queueing changes. With vsync on the wait is normally a no-op.
 */
export function installGpuFramePacing(scene: THREE.Scene): void {
  let fence: WebGLSync | null = null;
  const webgl2 = (r: THREE.WebGLRenderer): WebGL2RenderingContext | null => {
    const gl = r.getContext();
    return typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? gl : null;
  };
  const prevBefore = scene.onBeforeRender;
  const prevAfter = scene.onAfterRender;
  scene.onBeforeRender = function (renderer, ...rest) {
    const gl = webgl2(renderer);
    if (gl && fence) {
      try {
        // Sync status only updates between tasks, i.e. it reflects the GPU state of the previous frame.
        if (gl.clientWaitSync(fence, 0, 0) === gl.TIMEOUT_EXPIRED) gl.finish();
        gl.deleteSync(fence);
      } catch { /* context lost: render without pacing */ }
      fence = null;
    }
    prevBefore.call(this, renderer, ...rest);
  };
  scene.onAfterRender = function (renderer, ...rest) {
    prevAfter.call(this, renderer, ...rest);
    const gl = webgl2(renderer);
    if (!gl) return;
    try {
      fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
    } catch {
      fence = null;
    }
  };
}
