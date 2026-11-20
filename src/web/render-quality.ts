import * as THREE from 'three';

export interface RenderQuality {
  cpu: boolean;
  antialias: boolean;
  pixelRatioCap: number;
  /** Lanterns and Mây get real PointLights only when true. */
  pointLights: boolean;
}

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|software/i;

/** Probe the WebGL renderer string with a throwaway context. Returns '' if unavailable. */
function probeRendererString(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  } catch {
    return '';
  }
}

/** CPU (software) mode: ?cpu=1 or a software GL renderer. Otherwise normal quality. */
export function detectQuality(): RenderQuality {
  const forced = new URLSearchParams(window.location.search).get('cpu') === '1';
  const cpu = forced || SOFTWARE_RENDERER.test(probeRendererString());
  return cpu
    ? { cpu, antialias: false, pixelRatioCap: 0.85, pointLights: false }
    : { cpu, antialias: true, pixelRatioCap: 2, pointLights: true };
}

/** Real renderer built from the chosen quality. No shadows, no log depth buffer in any mode. */
export function createRenderer(q: RenderQuality): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: q.antialias,
    powerPreference: q.cpu ? 'low-power' : 'default',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.pixelRatioCap));
  renderer.shadowMap.enabled = false;
  return renderer;
}
