import type { PerspectiveCamera, WebGLRenderer } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export function createOrbitControls(
  camera: PerspectiveCamera,
  renderer: WebGLRenderer,
  testMode: boolean,
  onChange: () => void,
) {
  const controls = new OrbitControls(camera, renderer.domElement);

  controls.enableDamping = !testMode;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.minDistance = 5;
  controls.maxDistance = 40;
  controls.target.set(0, 0, 0);
  controls.addEventListener("change", onChange);

  return controls;
}
