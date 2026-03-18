import {
  AmbientLight,
  Color,
  Group,
  HemisphereLight,
  PerspectiveCamera,
  PointLight,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";

import { createOrbitControls } from "./controls";
import { createScaffoldPlanetarium } from "./planets";

declare global {
  interface Window {
    __PLANETARIUM__?: {
      renderReady: boolean;
      renderCount: number;
      planetCount: number;
      getCameraPosition: () => number[];
      sampleCenterPixel: () => number[];
    };
  }
}

type SceneOptions = {
  testMode: boolean;
  onFirstRender: () => void;
  onCameraChange: (summary: string) => void;
};

type PlanetariumScene = {
  destroy: () => void;
};

function formatVector(vector: Vector3) {
  return vector
    .toArray()
    .map((value) => value.toFixed(2))
    .join(", ");
}

export function createPlanetariumScene(
  container: HTMLDivElement,
  options: SceneOptions,
): PlanetariumScene {
  const scene = new Scene();
  scene.background = new Color("#04131e");

  const renderer = new WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: options.testMode,
  });
  renderer.setPixelRatio(options.testMode ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.domElement.dataset.testid = "scene-canvas";
  renderer.domElement.className = "scene-canvas";
  container.prepend(renderer.domElement);

  const camera = new PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100,
  );
  camera.position.set(0, 4, 16);

  let renderCount = 0;
  let firstRenderCompleted = false;
  let destroyed = false;

  document.body.dataset.renderReady = "false";

  const rig = new Group();
  scene.add(rig);

  const { planetGroup, planetCount } = createScaffoldPlanetarium();
  rig.add(planetGroup);

  const ambientLight = new AmbientLight("#1a4f73", 0.55);
  const hemisphereLight = new HemisphereLight("#8ed3ff", "#08131b", 0.5);
  const sunLight = new PointLight("#ffd66b", 35, 90, 2);
  rig.add(ambientLight);
  rig.add(hemisphereLight);
  rig.add(sunLight);

  window.__PLANETARIUM__ = {
    renderReady: false,
    renderCount: 0,
    planetCount,
    getCameraPosition: () => [...camera.position.toArray()],
    sampleCenterPixel: () => {
      const gl = renderer.getContext();
      const pixel = new Uint8Array(4);
      const x = Math.floor(renderer.domElement.width / 2);
      const y = Math.floor(renderer.domElement.height / 2);

      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

      return Array.from(pixel);
    },
  };

  const controls = createOrbitControls(camera, renderer, options.testMode, renderFrame);
  controls.update();

  function handleResize() {
    if (destroyed) {
      return;
    }

    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderFrame();
  }

  function renderFrame() {
    if (destroyed) {
      return;
    }

    renderer.render(scene, camera);

    renderCount += 1;
    options.onCameraChange(formatVector(camera.position));

    if (window.__PLANETARIUM__) {
      window.__PLANETARIUM__.renderCount = renderCount;
      window.__PLANETARIUM__.renderReady = true;
    }

    if (!firstRenderCompleted) {
      firstRenderCompleted = true;
      document.body.dataset.renderReady = "true";
      renderer.domElement.dataset.renderReady = "true";
      options.onFirstRender();
    }
  }

  window.addEventListener("resize", handleResize);

  if (options.testMode) {
    renderFrame();
  } else {
    renderer.setAnimationLoop(() => {
      controls.update();
      renderFrame();
    });
  }

  return {
    destroy() {
      destroyed = true;
      window.removeEventListener("resize", handleResize);
      renderer.setAnimationLoop(null);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      delete window.__PLANETARIUM__;
    },
  };
}
