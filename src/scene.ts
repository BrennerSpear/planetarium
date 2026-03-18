import {
  ACESFilmicToneMapping,
  AmbientLight,
  BufferGeometry,
  CatmullRomCurve3,
  Clock,
  Color,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { ControlPanel } from "./controls";
import {
  formatDistanceAu,
  getPlanetSnapshots,
  getSunRadii,
  type PlanetSnapshot,
  type ScaleMode,
  TARGET_DATE_LABEL,
  TARGET_JULIAN_DATE,
  SUN_DEFINITION,
} from "./planets";
import { createPlanetTexture } from "./textures";
import type { OverlayLayer } from "./ui/overlay";

interface PlanetariumSceneOptions {
  canvasRoot: HTMLElement;
  controls: ControlPanel;
  overlay: OverlayLayer;
  testMode: boolean;
}

interface PlanetMeshInstance {
  snapshot: PlanetSnapshot;
  anchor: Group;
  mesh: Mesh;
  material: MeshStandardMaterial;
  currentRadius: number;
}

interface CameraFraming {
  position: Vector3;
  target: Vector3;
  up: Vector3;
  introPosition: Vector3;
}

interface TestApiState {
  ready: boolean;
  dateLabel: string;
  julianDate: number;
  scaleMode: ScaleMode;
  planetCount: number;
  labels: string[];
  selectedPlanetId: string | null;
  hoveredPlanetId: string | null;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
  };
}

declare global {
  interface Window {
    __planetariumTestApi?: {
      getState(): TestApiState;
    };
  }
}

const CAMERA_FOV = 46;
const PLANET_LABEL_OFFSET_SCALE = 2.1;
const CAMERA_FRAME_PADDING = 1.16;
const INITIAL_FRAME_DURATION_SECONDS = 1.4;
const INITIAL_DOLLY_FACTOR = 1.12;
const INITIAL_SIDE_DRIFT_RATIO = -0.04;
const INITIAL_DROP_RATIO = -0.03;
const AUTO_ROTATE_SPEED = 0.28;

export function createPlanetariumScene(options: PlanetariumSceneOptions): {
  selectPlanet(planetId: string): void;
  setScaleMode(mode: ScaleMode): void;
} {
  const scene = new Scene();
  scene.background = new Color("#03070f");

  const renderer = new WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.setPixelRatio(options.testMode ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(options.canvasRoot.clientWidth, options.canvasRoot.clientHeight, false);
  renderer.domElement.className = "scene-canvas";
  options.canvasRoot.append(renderer.domElement);

  const camera = new PerspectiveCamera(
    CAMERA_FOV,
    options.canvasRoot.clientWidth / Math.max(options.canvasRoot.clientHeight, 1),
    0.01,
    500,
  );

  const ambientLight = new AmbientLight(0x6f8ac2, 0.24);
  scene.add(ambientLight);

  const sunlight = new PointLight(0xfff1c9, 360, 0, 2);
  sunlight.position.set(0, 0, 0);
  scene.add(sunlight);

  const sunGeometry = new SphereGeometry(1, 64, 32);
  const sunMaterial = new MeshBasicMaterial({
    map: createPlanetTexture(SUN_DEFINITION),
    color: 0xffffff,
  });
  const sunMesh = new Mesh(sunGeometry, sunMaterial);
  scene.add(sunMesh);

  const snapshots = getPlanetSnapshots(TARGET_JULIAN_DATE);
  const geometry = new SphereGeometry(1, 64, 32);
  const planetInstances: PlanetMeshInstance[] = [];
  const planetMeshes: Mesh[] = [];
  const snapshotById = new Map<string, PlanetSnapshot>();

  for (const snapshot of snapshots) {
    snapshotById.set(snapshot.definition.id, snapshot);

    const material = new MeshStandardMaterial({
      map: createPlanetTexture(snapshot.definition),
      roughness: snapshot.definition.visual.kind === "gas" ? 0.98 : 0.92,
      metalness: 0,
      color: 0xffffff,
      emissive: new Color("#000000"),
      emissiveIntensity: 0,
    });
    const mesh = new Mesh(geometry, material);
    mesh.userData.planetId = snapshot.definition.id;

    const anchor = new Group();
    anchor.position.copy(snapshot.position);
    anchor.add(mesh);
    scene.add(anchor);

    planetInstances.push({
      snapshot,
      anchor,
      mesh,
      material,
      currentRadius: snapshot.visibleRadiusAu,
    });
    planetMeshes.push(mesh);
  }

  const orderedForSpine = [...planetInstances].sort((left, right) => left.snapshot.heliocentricDistanceAu - right.snapshot.heliocentricDistanceAu);
  const curve = new CatmullRomCurve3(
    orderedForSpine.map((instance) => instance.snapshot.position.clone()),
    false,
    "catmullrom",
    0.15,
  );
  const spineGeometry = new BufferGeometry().setFromPoints(curve.getPoints(128));
  const spineMaterial = new LineBasicMaterial({
    color: 0x9dbdf7,
    transparent: true,
    opacity: 0.72,
  });
  const spineLine = new Line(spineGeometry, spineMaterial);
  scene.add(spineLine);

  const raycaster = new Raycaster();
  const pointer = new Vector2(2, 2);
  const clock = new Clock();
  const sunRadii = getSunRadii();
  let sunRadius = sunRadii.visibleRadiusAu;
  let scaleMode: ScaleMode = "visible";
  let hoveredPlanetId: string | null = null;
  let selectedPlanetId: string | null = null;
  let viewport = {
    width: options.canvasRoot.clientWidth,
    height: options.canvasRoot.clientHeight,
  };
  let framing = computeCameraFraming(orderedForSpine.map((instance) => instance.snapshot), camera);
  let introElapsedSeconds = options.testMode ? INITIAL_FRAME_DURATION_SECONDS : 0;
  let autoMotionStopped = options.testMode;

  camera.position.copy(options.testMode ? framing.position : framing.introPosition);
  camera.up.copy(framing.up);
  camera.lookAt(framing.target);

  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.target.copy(framing.target);
  orbitControls.enableDamping = !options.testMode;
  orbitControls.dampingFactor = 0.08;
  orbitControls.minDistance = 0.2;
  orbitControls.maxDistance = 180;
  orbitControls.autoRotate = false;
  orbitControls.autoRotateSpeed = AUTO_ROTATE_SPEED;
  orbitControls.update();

  const testState: TestApiState = {
    ready: false,
    dateLabel: TARGET_DATE_LABEL,
    julianDate: TARGET_JULIAN_DATE,
    scaleMode,
    planetCount: snapshots.length,
    labels: snapshots.map((snapshot) => snapshot.definition.label),
    selectedPlanetId: null,
    hoveredPlanetId: null,
    camera: {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [orbitControls.target.x, orbitControls.target.y, orbitControls.target.z],
    },
  };

  window.__planetariumTestApi = {
    getState() {
      return structuredClone(testState);
    },
  };

  const updateFocus = () => {
    const activeId = selectedPlanetId ?? hoveredPlanetId;
    const activeSnapshot = activeId ? snapshotById.get(activeId) ?? null : null;
    const source = selectedPlanetId ? "selected" : hoveredPlanetId ? "hover" : "none";
    options.controls.updateFocus(activeSnapshot, source);
    testState.selectedPlanetId = selectedPlanetId;
    testState.hoveredPlanetId = hoveredPlanetId;
  };

  const setScaleMode = (mode: ScaleMode) => {
    scaleMode = mode;
    options.controls.setScaleMode(mode);
    testState.scaleMode = mode;
    document.body.dataset.scaleMode = mode;
  };

  const stopAutoMotion = () => {
    if (autoMotionStopped) {
      return;
    }

    autoMotionStopped = true;
    introElapsedSeconds = INITIAL_FRAME_DURATION_SECONDS;
    orbitControls.autoRotate = false;
    flushControlMotion(camera, orbitControls);
  };

  const selectPlanet = (planetId: string) => {
    stopAutoMotion();
    selectedPlanetId = selectedPlanetId === planetId ? null : planetId;
    updateFocus();
  };

  options.controls.setScaleMode(scaleMode);
  options.overlay.bindPlanetSelection((planetId) => {
    selectPlanet(planetId);
  });

  renderer.domElement.addEventListener("pointermove", (event: PointerEvent) => {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  });

  renderer.domElement.addEventListener("pointerleave", () => {
    hoveredPlanetId = null;
    pointer.set(2, 2);
    updateFocus();
  });

  renderer.domElement.addEventListener("click", () => {
    if (hoveredPlanetId) {
      selectPlanet(hoveredPlanetId);
    }
  });
  renderer.domElement.addEventListener("wheel", stopAutoMotion, { passive: true });
  orbitControls.addEventListener("start", stopAutoMotion);

  const onResize = () => {
    viewport = {
      width: options.canvasRoot.clientWidth,
      height: options.canvasRoot.clientHeight,
    };

    camera.aspect = viewport.width / Math.max(viewport.height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(viewport.width, viewport.height, false);
    renderer.setPixelRatio(options.testMode ? 1 : Math.min(window.devicePixelRatio, 2));

    if (!autoMotionStopped) {
      framing = computeCameraFraming(orderedForSpine.map((instance) => instance.snapshot), camera);
      applyFraming(camera, orbitControls, framing, introElapsedSeconds, options.testMode);
    }
  };

  window.addEventListener("resize", onResize);

  const renderFrame = () => {
    const frameDelta = options.testMode ? 0 : Math.min(clock.getDelta(), 0.1);
    const delta = options.testMode ? 1 : Math.min(frameDelta * 5.5, 1);

    if (!options.testMode && !autoMotionStopped && introElapsedSeconds < INITIAL_FRAME_DURATION_SECONDS) {
      introElapsedSeconds = Math.min(introElapsedSeconds + frameDelta, INITIAL_FRAME_DURATION_SECONDS);
      applyFraming(camera, orbitControls, framing, introElapsedSeconds, false);

      if (introElapsedSeconds >= INITIAL_FRAME_DURATION_SECONDS) {
        orbitControls.autoRotate = true;
      }
    }

    orbitControls.update();

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(planetMeshes, false)[0];
    hoveredPlanetId = typeof hit?.object.userData.planetId === "string" ? hit.object.userData.planetId : null;
    updateFocus();

    const displayedLabels = [];

    for (const instance of planetInstances) {
      const isFocused = instance.snapshot.definition.id === selectedPlanetId || instance.snapshot.definition.id === hoveredPlanetId;
      const targetRadius = scaleMode === "true"
        ? instance.snapshot.trueRadiusAu
        : instance.snapshot.visibleRadiusAu;
      instance.currentRadius = options.testMode
        ? targetRadius
        : lerp(instance.currentRadius, targetRadius, delta * 0.22 + 0.08);
      instance.mesh.scale.setScalar(instance.currentRadius);

      const baseEmissive = new Color(instance.snapshot.definition.visual.accentColor);
      const emissiveIntensity = instance.snapshot.definition.id === selectedPlanetId
        ? 0.28
        : instance.snapshot.definition.id === hoveredPlanetId
          ? 0.18
          : 0.04;
      instance.material.emissive.copy(baseEmissive);
      instance.material.emissiveIntensity = emissiveIntensity;
      instance.material.needsUpdate = false;

      displayedLabels.push({
        id: instance.snapshot.definition.id,
        label: instance.snapshot.definition.label,
        position: instance.snapshot.position.clone().add(new Vector3(0, instance.currentRadius * (isFocused ? 2.5 : PLANET_LABEL_OFFSET_SCALE), 0)),
      });
    }

    const targetSunRadius = scaleMode === "true" ? sunRadii.trueRadiusAu : sunRadii.visibleRadiusAu;
    sunRadius = options.testMode ? targetSunRadius : lerp(sunRadius, targetSunRadius, delta * 0.2 + 0.08);
    sunMesh.scale.setScalar(sunRadius);

    const distanceLabels = orderedForSpine.slice(0, -1).map((instance, index) => {
      const next = orderedForSpine[index + 1];

      if (!next) {
        return null;
      }

      const midpoint = instance.snapshot.position.clone().lerp(next.snapshot.position, 0.5);
      midpoint.y += 0.2;

      return {
        id: `${instance.snapshot.definition.id}-${next.snapshot.definition.id}`,
        label: formatDistanceAu(instance.snapshot.position.distanceTo(next.snapshot.position)),
        position: midpoint,
      };
    }).filter((label): label is NonNullable<typeof label> => Boolean(label));

    options.overlay.syncPlanetLabels(displayedLabels, camera, viewport, {
      hoveredId: hoveredPlanetId,
      selectedId: selectedPlanetId,
    });
    options.overlay.syncDistanceLabels(distanceLabels, camera, viewport);

    renderer.render(scene, camera);

    testState.camera = {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [orbitControls.target.x, orbitControls.target.y, orbitControls.target.z],
    };
    testState.ready = true;
    document.body.dataset.sceneReady = "true";
    requestAnimationFrame(renderFrame);
  };

  renderFrame();

  return {
    selectPlanet,
    setScaleMode,
  };
}

function lerp(a: number, b: number, amount: number): number {
  return a + (b - a) * amount;
}

function applyFraming(
  camera: PerspectiveCamera,
  orbitControls: OrbitControls,
  framing: CameraFraming,
  introElapsedSeconds: number,
  testMode: boolean,
): void {
  const progress = testMode ? 1 : easeOutCubic(introElapsedSeconds / INITIAL_FRAME_DURATION_SECONDS);

  camera.position.lerpVectors(framing.introPosition, framing.position, progress);
  camera.up.copy(framing.up);
  orbitControls.target.copy(framing.target);
  camera.lookAt(framing.target);
}

function computeCameraFraming(snapshots: PlanetSnapshot[], camera: PerspectiveCamera): CameraFraming {
  const ordered = [...snapshots].sort((left, right) => left.heliocentricDistanceAu - right.heliocentricDistanceAu);
  const target = ordered[Math.floor(ordered.length / 2)]?.position.clone() ?? new Vector3(0, 0, 0);
  const furthest = ordered.at(-1)?.position.clone() ?? new Vector3(0, 0, 1);
  const alignmentAxis = furthest.lengthSq() > 0 ? furthest.normalize() : new Vector3(0, 0, 1);
  const worldUp = new Vector3(0, 1, 0);
  const lateralAxis = new Vector3().crossVectors(worldUp, alignmentAxis);

  if (lateralAxis.lengthSq() === 0) {
    lateralAxis.set(1, 0, 0);
  } else {
    lateralAxis.normalize();
  }

  const verticalAxis = new Vector3().crossVectors(alignmentAxis, lateralAxis).normalize();
  const viewDirection = alignmentAxis
    .clone()
    .multiplyScalar(0.75)
    .add(lateralAxis.clone().multiplyScalar(0.3))
    .add(verticalAxis.clone().multiplyScalar(0.4))
    .normalize();
  const forward = viewDirection.clone().negate();
  const right = new Vector3().crossVectors(forward, worldUp).normalize();
  const up = new Vector3().crossVectors(right, forward).normalize();
  const framingPoints = [
    new Vector3(0, 0, 0),
    ...ordered.map((snapshot) => snapshot.position.clone().add(new Vector3(0, snapshot.visibleRadiusAu * PLANET_LABEL_OFFSET_SCALE, 0))),
  ];

  const verticalFov = camera.fov * (Math.PI / 180);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  const tanVertical = Math.tan(verticalFov / 2);
  const tanHorizontal = Math.tan(horizontalFov / 2);
  let distance = 0;

  for (const point of framingPoints) {
    const relative = point.clone().sub(target);
    const horizontalOffset = Math.abs(relative.dot(right));
    const verticalOffset = Math.abs(relative.dot(up));
    const forwardOffset = relative.dot(viewDirection);
    distance = Math.max(
      distance,
      forwardOffset + horizontalOffset / Math.max(tanHorizontal, Number.EPSILON),
      forwardOffset + verticalOffset / Math.max(tanVertical, Number.EPSILON),
    );
  }

  distance *= CAMERA_FRAME_PADDING;

  const position = target.clone().add(viewDirection.multiplyScalar(distance));
  const introPosition = target
    .clone()
    .add(position.clone().sub(target).multiplyScalar(INITIAL_DOLLY_FACTOR))
    .add(right.clone().multiplyScalar(distance * INITIAL_SIDE_DRIFT_RATIO))
    .add(up.clone().multiplyScalar(distance * INITIAL_DROP_RATIO));

  return {
    position,
    target,
    up,
    introPosition,
  };
}

function flushControlMotion(camera: PerspectiveCamera, orbitControls: OrbitControls): void {
  const savedPosition = camera.position.clone();
  const savedTarget = orbitControls.target.clone();
  const savedDamping = orbitControls.enableDamping;

  orbitControls.enableDamping = false;
  orbitControls.update();

  camera.position.copy(savedPosition);
  orbitControls.target.copy(savedTarget);
  camera.lookAt(savedTarget);
  orbitControls.update();
  orbitControls.enableDamping = savedDamping;
}

function easeOutCubic(value: number): number {
  const clamped = Math.min(Math.max(value, 0), 1);
  return 1 - ((1 - clamped) ** 3);
}
