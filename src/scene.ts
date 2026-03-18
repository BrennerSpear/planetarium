import {
  ACESFilmicToneMapping,
  AmbientLight,
  BackSide,
  BufferGeometry,
  CanvasTexture,
  Clock,
  ClampToEdgeWrapping,
  Color,
  Float32BufferAttribute,
  Group,
  LinearFilter,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  LineLoop,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Raycaster,
  Scene,
  ShaderMaterial,
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
  getDisplayPosition,
  getOrbitPathPoints,
  getPlanetSnapshots,
  getSunRadii,
  type PlanetSnapshot,
  type ScaleMode,
  SUN_DEFINITION,
  TARGET_DATE_LABEL,
  TARGET_JULIAN_DATE,
} from "./planets";
import { createMulberry32 } from "./random";
import { createPlanetTexture } from "./textures";
import type { OverlayAlignmentGuide, OverlayLayer } from "./ui/overlay";

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
  visiblePosition: Vector3;
  currentPosition: Vector3;
  currentRadius: number;
}

interface OrbitLineInstance {
  geometry: BufferGeometry;
  truePoints: Vector3[];
  visiblePoints: Vector3[];
  currentPoints: Vector3[];
}

interface CameraFraming {
  position: Vector3;
  target: Vector3;
  up: Vector3;
  introPosition: Vector3;
}

interface CameraAnimationState {
  startPosition: Vector3;
  endPosition: Vector3;
  startTarget: Vector3;
  endTarget: Vector3;
  progress: number;
}

interface AlignmentLayout {
  axisDirection: Vector3;
  axisGuide: OverlayAlignmentGuide;
  axisLengthAu: number;
  axisConnectorCount: number;
  distanceLabels: {
    id: string;
    label: string;
    position: Vector3;
  }[];
  offsetByPlanetId: Record<string, number>;
  orderedPlanetIds: string[];
  tickPoints: Vector3[];
}

interface TestApiState {
  ready: boolean;
  dateLabel: string;
  julianDate: number;
  scaleMode: ScaleMode;
  planetCount: number;
  orbitCount: number;
  labels: string[];
  selectedPlanetId: string | null;
  hoveredPlanetId: string | null;
  alignment: {
    axisDirection: [number, number, number];
    axisLengthAu: number;
    connectorCount: number;
    orderedPlanetIds: string[];
    offsetByPlanetId: Record<string, number>;
  };
  planetActualDistancesAu: Record<string, number>;
  planetDisplayDistancesAu: Record<string, number>;
  planetDisplayPositions: Record<string, [number, number, number]>;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
  };
  background: {
    starCount: number;
    starSeed: number;
    layerCount: number;
  };
}

interface BackgroundLayerConfig {
  count: number;
  radius: number;
  size: number;
  brightnessRange: readonly [number, number];
}

interface BackgroundBackdrop {
  group: Group;
  starCount: number;
  starSeed: number;
  layerCount: number;
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
const STARFIELD_SEED = 2_161_519;
const STARFIELD_LAYERS: readonly BackgroundLayerConfig[] = [
  { count: 2_800, radius: 320, size: 1.15, brightnessRange: [0.42, 0.72] },
  { count: 1_050, radius: 334, size: 1.65, brightnessRange: [0.62, 0.88] },
  { count: 360, radius: 348, size: 2.2, brightnessRange: [0.78, 1] },
];
const STARFIELD_TONES = [
  new Color("#f6fbff"),
  new Color("#dfeaff"),
  new Color("#d2e1ff"),
] as const;

export function createPlanetariumScene(options: PlanetariumSceneOptions): {
  focusPlanet(planetId: string): void;
  setScaleMode(mode: ScaleMode): void;
} {
  const scene = new Scene();

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
  const backgroundBackdrop = createBackgroundBackdrop();
  scene.add(backgroundBackdrop.group);

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
  const planetGeometry = new SphereGeometry(1, 64, 32);
  const planetInstances: PlanetMeshInstance[] = [];
  const planetMeshes: Mesh[] = [];
  const orbitInstances: OrbitLineInstance[] = [];
  const snapshotById = new Map<string, PlanetSnapshot>();
  const planetById = new Map<string, PlanetMeshInstance>();

  for (const snapshot of snapshots) {
    snapshotById.set(snapshot.definition.id, snapshot);

    const trueOrbitPoints = getOrbitPathPoints(snapshot.definition, TARGET_JULIAN_DATE);
    const visibleOrbitPoints = trueOrbitPoints.map((point) => getDisplayPosition(point, "visible"));
    const currentOrbitPoints = visibleOrbitPoints.map((point) => point.clone());
    const orbitGeometry = new BufferGeometry().setFromPoints(currentOrbitPoints);
    const orbitMaterial = new LineBasicMaterial({
      color: new Color(snapshot.definition.visual.accentColor),
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
    });
    const orbitLine = new LineLoop(orbitGeometry, orbitMaterial);
    scene.add(orbitLine);
    orbitInstances.push({
      geometry: orbitGeometry,
      truePoints: trueOrbitPoints,
      visiblePoints: visibleOrbitPoints,
      currentPoints: currentOrbitPoints,
    });

    const material = new MeshStandardMaterial({
      map: createPlanetTexture(snapshot.definition),
      roughness: snapshot.definition.visual.kind === "gas" ? 0.98 : 0.92,
      metalness: 0,
      color: 0xffffff,
      emissive: new Color("#000000"),
      emissiveIntensity: 0,
    });
    const mesh = new Mesh(planetGeometry, material);
    mesh.userData.planetId = snapshot.definition.id;

    const visiblePosition = getDisplayPosition(snapshot.position, "visible");
    const anchor = new Group();
    anchor.position.copy(visiblePosition);
    anchor.add(mesh);
    scene.add(anchor);

    const instance: PlanetMeshInstance = {
      snapshot,
      anchor,
      mesh,
      material,
      visiblePosition,
      currentPosition: visiblePosition.clone(),
      currentRadius: snapshot.visibleRadiusAu,
    };

    planetInstances.push(instance);
    planetMeshes.push(mesh);
    planetById.set(snapshot.definition.id, instance);
  }

  const orderedForAxis = [...planetInstances].sort(
    (left, right) => left.snapshot.heliocentricDistanceAu - right.snapshot.heliocentricDistanceAu,
  );
  let alignmentLayout = createAlignmentLayout(orderedForAxis);
  const alignmentGeometry = new BufferGeometry().setFromPoints([
    new Vector3(0, 0, 0),
    alignmentLayout.axisDirection.clone().multiplyScalar(alignmentLayout.axisLengthAu),
  ]);
  const alignmentUnderlayMaterial = new LineBasicMaterial({
    color: 0xc8dcff,
    transparent: true,
    opacity: 0.38,
    depthTest: false,
    depthWrite: false,
  });
  const alignmentUnderlay = new Line(alignmentGeometry, alignmentUnderlayMaterial);
  alignmentUnderlay.renderOrder = 1;
  scene.add(alignmentUnderlay);
  const alignmentMaterial = new LineDashedMaterial({
    color: 0xf2f7ff,
    transparent: true,
    opacity: 0.92,
    dashSize: 0.44,
    gapSize: 0.28,
    depthTest: false,
    depthWrite: false,
  });
  const alignmentLine = new Line(alignmentGeometry, alignmentMaterial);
  alignmentLine.computeLineDistances();
  alignmentLine.renderOrder = 2;
  scene.add(alignmentLine);

  const alignmentDotsGeometry = new BufferGeometry().setFromPoints(createAlignmentDotPoints(
    alignmentLayout.axisDirection,
    alignmentLayout.axisLengthAu,
    1.6,
  ));
  const alignmentDots = new Points(
    alignmentDotsGeometry,
    new PointsMaterial({
      color: 0xf8fbff,
      size: 0.32,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );
  alignmentDots.renderOrder = 2;
  scene.add(alignmentDots);

  const tickGeometry = new BufferGeometry().setFromPoints(alignmentLayout.tickPoints);
  const tickMaterial = new LineBasicMaterial({
    color: 0xe4eeff,
    transparent: true,
    opacity: 0.6,
    depthTest: false,
    depthWrite: false,
  });
  const alignmentTicks = new LineSegments(tickGeometry, tickMaterial);
  alignmentTicks.renderOrder = 2;
  scene.add(alignmentTicks);

  const raycaster = new Raycaster();
  const pointer = new Vector2(2, 2);
  const clock = new Clock();
  const sunRadii = getSunRadii();
  let sunRadius = sunRadii.visibleRadiusAu;
  let scaleMode: ScaleMode = "visible";
  let hoveredPlanetId: string | null = null;
  let selectedPlanetId: string | null = null;
  let cameraAnimation: CameraAnimationState | null = null;
  let viewport = {
    width: options.canvasRoot.clientWidth,
    height: options.canvasRoot.clientHeight,
  };
  let framing = computeCameraFraming(orderedForAxis, camera);
  let introElapsedSeconds = options.testMode ? INITIAL_FRAME_DURATION_SECONDS : 0;
  let autoMotionStopped = options.testMode;

  camera.position.copy(options.testMode ? framing.position : framing.introPosition);
  camera.up.copy(framing.up);
  camera.lookAt(framing.target);
  backgroundBackdrop.group.position.copy(camera.position);

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
    orbitCount: orbitInstances.length,
    labels: snapshots.map((snapshot) => snapshot.definition.label),
    selectedPlanetId: null,
    hoveredPlanetId: null,
    alignment: {
      axisDirection: toTuple(alignmentLayout.axisDirection),
      axisLengthAu: alignmentLayout.axisLengthAu,
      connectorCount: alignmentLayout.axisConnectorCount,
      orderedPlanetIds: alignmentLayout.orderedPlanetIds,
      offsetByPlanetId: { ...alignmentLayout.offsetByPlanetId },
    },
    planetActualDistancesAu: Object.fromEntries(
      snapshots.map((snapshot) => [snapshot.definition.id, snapshot.heliocentricDistanceAu]),
    ),
    planetDisplayDistancesAu: Object.fromEntries(
      planetInstances.map((instance) => [instance.snapshot.definition.id, instance.currentPosition.length()]),
    ),
    planetDisplayPositions: Object.fromEntries(
      planetInstances.map((instance) => [instance.snapshot.definition.id, toTuple(instance.currentPosition)]),
    ),
    camera: {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [orbitControls.target.x, orbitControls.target.y, orbitControls.target.z],
    },
    background: {
      starCount: backgroundBackdrop.starCount,
      starSeed: backgroundBackdrop.starSeed,
      layerCount: backgroundBackdrop.layerCount,
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

  const applyCameraPose = (position: Vector3, target: Vector3) => {
    camera.position.copy(position);
    orbitControls.target.copy(target);
    camera.lookAt(target);
  };

  const getPlanetTargetPosition = (instance: PlanetMeshInstance): Vector3 => {
    return scaleMode === "true"
      ? instance.snapshot.position
      : instance.visiblePosition;
  };

  const getFocusDistance = (instance: PlanetMeshInstance): number => {
    if (scaleMode === "true") {
      return clamp(instance.snapshot.heliocentricDistanceAu * 0.08, 0.45, 1.25);
    }

    return clamp(instance.snapshot.visibleRadiusAu * 24, 1.6, 3.9);
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

  const focusPlanet = (planetId: string) => {
    const instance = planetById.get(planetId);

    if (!instance) {
      return;
    }

    stopAutoMotion();
    selectedPlanetId = planetId;
    updateFocus();

    const target = getPlanetTargetPosition(instance).clone();
    const preferredDirection = camera.position.clone().sub(orbitControls.target);

    if (preferredDirection.lengthSq() < 1e-6) {
      preferredDirection.set(0.42, 0.22, 1);
    }

    preferredDirection.normalize().lerp(new Vector3(0.36, 0.18, 1).normalize(), 0.18).normalize();

    const focusDistance = getFocusDistance(instance);
    const endPosition = target.clone()
      .add(preferredDirection.multiplyScalar(focusDistance))
      .add(new Vector3(0, focusDistance * 0.14, 0));

    if (options.testMode) {
      cameraAnimation = null;
      orbitControls.enabled = true;
      applyCameraPose(endPosition, target);
      orbitControls.update();
      return;
    }

    cameraAnimation = {
      startPosition: camera.position.clone(),
      endPosition,
      startTarget: orbitControls.target.clone(),
      endTarget: target,
      progress: 0,
    };
    orbitControls.autoRotate = false;
    orbitControls.enabled = false;
  };

  const togglePlanetSelection = (planetId: string) => {
    stopAutoMotion();
    selectedPlanetId = selectedPlanetId === planetId ? null : planetId;
    updateFocus();
  };

  const setScaleMode = (mode: ScaleMode) => {
    stopAutoMotion();
    scaleMode = mode;
    options.controls.setScaleMode(mode);
    testState.scaleMode = mode;
    document.body.dataset.scaleMode = mode;

    if (selectedPlanetId) {
      focusPlanet(selectedPlanetId);
    }
  };

  const applyAlignmentLayout = (layout: AlignmentLayout) => {
    alignmentGeometry.setFromPoints([
      new Vector3(0, 0, 0),
      layout.axisDirection.clone().multiplyScalar(layout.axisLengthAu),
    ]);
    alignmentLine.computeLineDistances();
    alignmentDotsGeometry.setFromPoints(createAlignmentDotPoints(
      layout.axisDirection,
      layout.axisLengthAu,
      1.6,
    ));
    tickGeometry.setFromPoints(layout.tickPoints);
  };

  options.controls.setScaleMode(scaleMode);

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
      togglePlanetSelection(hoveredPlanetId);
    }
  });
  renderer.domElement.addEventListener("wheel", stopAutoMotion, { passive: true });
  orbitControls.addEventListener("start", () => {
    stopAutoMotion();
    cameraAnimation = null;
    orbitControls.enabled = true;
  });

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
      framing = computeCameraFraming(orderedForAxis, camera);
      applyFraming(camera, orbitControls, framing, introElapsedSeconds, options.testMode);
    }
  };

  window.addEventListener("resize", onResize);

  const renderFrame = () => {
    const frameDelta = options.testMode ? 0 : Math.min(clock.getDelta(), 0.1);
    const delta = options.testMode ? 1 : Math.min(frameDelta * 5.5, 1);
    const geometryLerpAmount = options.testMode ? 1 : (delta * 0.18 + 0.08);
    const positionLerpAmount = options.testMode ? 1 : (delta * 0.22 + 0.08);

    for (const orbitInstance of orbitInstances) {
      const targetPoints = scaleMode === "true"
        ? orbitInstance.truePoints
        : orbitInstance.visiblePoints;

      for (let pointIndex = 0; pointIndex < orbitInstance.currentPoints.length; pointIndex += 1) {
        const currentPoint = orbitInstance.currentPoints[pointIndex];
        const targetPoint = targetPoints[pointIndex];

        if (currentPoint && targetPoint) {
          currentPoint.lerp(targetPoint, geometryLerpAmount);
        }
      }

      orbitInstance.geometry.setFromPoints(orbitInstance.currentPoints);
      orbitInstance.geometry.computeBoundingSphere();
    }

    const displayPositions: Record<string, [number, number, number]> = {};
    const displayDistances: Record<string, number> = {};

    for (const instance of planetInstances) {
      const targetRadius = scaleMode === "true"
        ? instance.snapshot.trueRadiusAu
        : instance.snapshot.visibleRadiusAu;
      const targetPosition = getPlanetTargetPosition(instance);

      instance.currentRadius = options.testMode
        ? targetRadius
        : lerp(instance.currentRadius, targetRadius, positionLerpAmount);
      instance.currentPosition.lerp(targetPosition, positionLerpAmount);

      instance.anchor.position.copy(instance.currentPosition);
      instance.mesh.scale.setScalar(instance.currentRadius);

      displayPositions[instance.snapshot.definition.id] = toTuple(instance.currentPosition);
      displayDistances[instance.snapshot.definition.id] = instance.currentPosition.length();
    }

    alignmentLayout = createAlignmentLayout(orderedForAxis);
    applyAlignmentLayout(alignmentLayout);

    const targetSunRadius = scaleMode === "true" ? sunRadii.trueRadiusAu : sunRadii.visibleRadiusAu;
    sunRadius = options.testMode ? targetSunRadius : lerp(sunRadius, targetSunRadius, delta * 0.2 + 0.08);
    sunMesh.scale.setScalar(sunRadius);

    if (!options.testMode && !autoMotionStopped && introElapsedSeconds < INITIAL_FRAME_DURATION_SECONDS) {
      introElapsedSeconds = Math.min(introElapsedSeconds + frameDelta, INITIAL_FRAME_DURATION_SECONDS);
      framing = computeCameraFraming(orderedForAxis, camera);
      applyFraming(camera, orbitControls, framing, introElapsedSeconds, false);

      if (introElapsedSeconds >= INITIAL_FRAME_DURATION_SECONDS) {
        orbitControls.autoRotate = true;
      }
    }

    if (cameraAnimation) {
      cameraAnimation.progress = options.testMode
        ? 1
        : Math.min(cameraAnimation.progress + frameDelta / 0.95, 1);

      const eased = easeInOutCubic(cameraAnimation.progress);
      applyCameraPose(
        cameraAnimation.startPosition.clone().lerp(cameraAnimation.endPosition, eased),
        cameraAnimation.startTarget.clone().lerp(cameraAnimation.endTarget, eased),
      );

      if (cameraAnimation.progress >= 1) {
        cameraAnimation = null;
        orbitControls.enabled = true;
      }
    }

    orbitControls.update();

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(planetMeshes, false)[0];
    hoveredPlanetId = typeof hit?.object.userData.planetId === "string" ? hit.object.userData.planetId : null;
    updateFocus();

    const displayedLabels = [];

    for (const instance of planetInstances) {
      const isFocused = instance.snapshot.definition.id === selectedPlanetId
        || instance.snapshot.definition.id === hoveredPlanetId;
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
        position: instance.currentPosition.clone().add(new Vector3(0, instance.currentRadius * (isFocused ? 2.5 : PLANET_LABEL_OFFSET_SCALE), 0)),
      });
    }

    options.overlay.syncPlanetLabels(displayedLabels, camera, viewport, {
      hoveredId: hoveredPlanetId,
      selectedId: selectedPlanetId,
    });
    options.overlay.syncAlignmentGuide(alignmentLayout.axisGuide, camera, viewport);
    options.overlay.syncDistanceLabels(alignmentLayout.distanceLabels, camera, viewport);

    backgroundBackdrop.group.position.copy(camera.position);
    renderer.render(scene, camera);

    testState.alignment = {
      axisDirection: toTuple(alignmentLayout.axisDirection),
      axisLengthAu: alignmentLayout.axisLengthAu,
      connectorCount: alignmentLayout.axisConnectorCount,
      orderedPlanetIds: alignmentLayout.orderedPlanetIds,
      offsetByPlanetId: { ...alignmentLayout.offsetByPlanetId },
    };
    testState.planetDisplayPositions = displayPositions;
    testState.planetDisplayDistancesAu = displayDistances;
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
    focusPlanet,
    setScaleMode,
  };
}

function lerp(a: number, b: number, amount: number): number {
  return a + (b - a) * amount;
}

function createBackgroundBackdrop(): BackgroundBackdrop {
  const group = new Group();
  let starCount = 0;

  const atmosphereMaterial = new ShaderMaterial({
    side: BackSide,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
    uniforms: {},
    vertexShader: `
      varying vec3 vWorldDirection;
      varying vec3 vViewDirection;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldDirection = normalize(worldPosition.xyz - cameraPosition);

        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vViewDirection = normalize(viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vWorldDirection;
      varying vec3 vViewDirection;

      float glow(vec3 direction, vec3 center, float falloff) {
        return pow(max(dot(normalize(direction), normalize(center)), 0.0), falloff);
      }

      void main() {
        vec3 direction = normalize(vWorldDirection);
        vec3 viewDirection = normalize(vViewDirection);

        vec3 color = vec3(0.012, 0.017, 0.038);
        float vertical = smoothstep(-0.22, 0.95, direction.y);
        color += vec3(0.010, 0.026, 0.060) * pow(vertical, 1.7);
        color += vec3(0.030, 0.018, 0.056) * glow(direction, vec3(-0.45, 0.28, -1.0), 7.0);
        color += vec3(0.016, 0.034, 0.076) * glow(direction, vec3(0.62, -0.10, 0.74), 8.0);
        color += vec3(0.012, 0.020, 0.040) * glow(direction, vec3(-0.20, -0.68, 0.40), 10.0);

        float edge = 1.0 - clamp(abs(viewDirection.z), 0.0, 1.0);
        float vignette = smoothstep(0.15, 0.92, edge);
        color *= 1.0 - vignette * 0.18;

        gl_FragColor = vec4(color, 0.92);
      }
    `,
  });
  const atmosphere = new Mesh(new SphereGeometry(360, 48, 24), atmosphereMaterial);
  atmosphere.renderOrder = -20;
  atmosphere.frustumCulled = false;
  group.add(atmosphere);

  const starSprite = createStarSpriteTexture();
  const rng = createMulberry32(STARFIELD_SEED);

  for (const layer of STARFIELD_LAYERS) {
    const geometry = new BufferGeometry();
    const positions = new Float32Array(layer.count * 3);
    const colors = new Float32Array(layer.count * 3);

    for (let starIndex = 0; starIndex < layer.count; starIndex += 1) {
      const z = rng() * 2 - 1;
      const theta = rng() * Math.PI * 2;
      const radial = Math.sqrt(Math.max(0, 1 - z * z));
      const radius = layer.radius * lerp(0.96, 1.04, rng());
      const offset = starIndex * 3;

      positions[offset] = Math.cos(theta) * radial * radius;
      positions[offset + 1] = z * radius;
      positions[offset + 2] = Math.sin(theta) * radial * radius;

      const tone = STARFIELD_TONES[Math.floor(rng() * STARFIELD_TONES.length)] ?? STARFIELD_TONES[0];
      const brightness = lerp(layer.brightnessRange[0], layer.brightnessRange[1], rng());
      colors[offset] = tone.r * brightness;
      colors[offset + 1] = tone.g * brightness;
      colors[offset + 2] = tone.b * brightness;
    }

    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));

    const material = new PointsMaterial({
      size: layer.size,
      sizeAttenuation: false,
      map: starSprite,
      transparent: true,
      alphaTest: 0.04,
      depthWrite: false,
      depthTest: true,
      vertexColors: true,
      toneMapped: false,
    });
    const stars = new Points(geometry, material);
    stars.renderOrder = -10;
    stars.frustumCulled = false;
    group.add(stars);
    starCount += layer.count;
  }

  return {
    group,
    starCount,
    starSeed: STARFIELD_SEED,
    layerCount: STARFIELD_LAYERS.length,
  };
}

function createStarSpriteTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create star sprite texture");
  }

  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.32, "rgba(255, 255, 255, 0.9)");
  gradient.addColorStop(0.72, "rgba(170, 204, 255, 0.28)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  return texture;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
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

function computeCameraFraming(orderedPlanets: PlanetMeshInstance[], camera: PerspectiveCamera): CameraFraming {
  const target = orderedPlanets[Math.floor(orderedPlanets.length / 2)]?.currentPosition.clone() ?? new Vector3(0, 0, 0);
  const furthest = orderedPlanets.at(-1)?.currentPosition.clone() ?? new Vector3(0, 0, 1);
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
    ...orderedPlanets.map((instance) => (
      instance.currentPosition.clone().add(new Vector3(0, instance.currentRadius * PLANET_LABEL_OFFSET_SCALE, 0))
    )),
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

function easeInOutCubic(value: number): number {
  return value < 0.5
    ? 4 * value ** 3
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function createAlignmentLayout(orderedPlanets: PlanetMeshInstance[]): AlignmentLayout {
  const axisDirection = getDominantAlignmentDirection(orderedPlanets);
  const furthestProjectionAu = orderedPlanets.at(-1)?.currentPosition.dot(axisDirection) ?? 0;
  const axisLengthAu = furthestProjectionAu + Math.max(1.25, furthestProjectionAu * 0.04);
  const labelNormal = getStableNormal(axisDirection);
  const maxTickLengthAu = Math.max(0.32, axisLengthAu * 0.026);
  const minTickLengthAu = 0.12;
  const offsetByPlanetId: Record<string, number> = {};
  const tickPoints: Vector3[] = [];
  const axisGuideTicks: OverlayAlignmentGuide["ticks"] = [];

  for (const instance of orderedPlanets) {
    const projectedDistanceAu = Math.max(0, instance.currentPosition.dot(axisDirection));
    const axisAnchor = axisDirection.clone().multiplyScalar(projectedDistanceAu);
    const offsetVector = instance.currentPosition.clone().sub(axisAnchor);
    const actualOffsetAu = offsetVector.length();
    offsetByPlanetId[instance.snapshot.definition.id] = actualOffsetAu;

    if (actualOffsetAu < 1e-4) {
      continue;
    }

    const tickLengthAu = Math.min(
      maxTickLengthAu,
      Math.max(minTickLengthAu, actualOffsetAu),
    );
    const tickEnd = axisAnchor.clone().add(offsetVector.normalize().multiplyScalar(tickLengthAu));
    tickPoints.push(axisAnchor, tickEnd);
    axisGuideTicks.push({
      id: instance.snapshot.definition.id,
      start: axisAnchor.clone(),
      end: tickEnd.clone(),
    });
  }

  const distanceLabels = orderedPlanets.flatMap((instance, index) => {
    const next = orderedPlanets[index + 1];

    if (!next) {
      return [];
    }

    const currentDistanceAu = Math.max(0, instance.currentPosition.dot(axisDirection));
    const nextDistanceAu = Math.max(0, next.currentPosition.dot(axisDirection));
    const gapAu = next.snapshot.heliocentricDistanceAu - instance.snapshot.heliocentricDistanceAu;
    const midpointDistanceAu = currentDistanceAu + (nextDistanceAu - currentDistanceAu) * 0.5;
    const offsetMagnitudeAu = 0.82 + Math.min(Math.abs(nextDistanceAu - currentDistanceAu) * 0.06, 0.46);
    const side = index % 2 === 0 ? 1 : -1;
    const position = axisDirection.clone()
      .multiplyScalar(midpointDistanceAu)
      .add(labelNormal.clone().multiplyScalar(offsetMagnitudeAu * side));

    return {
      id: `${instance.snapshot.definition.id}-${next.snapshot.definition.id}`,
      label: formatDistanceAu(gapAu),
      position,
    };
  });

  return {
    axisDirection,
    axisGuide: {
      axis: {
        start: new Vector3(0, 0, 0),
        end: axisDirection.clone().multiplyScalar(axisLengthAu),
      },
      ticks: axisGuideTicks,
    },
    axisLengthAu,
    axisConnectorCount: tickPoints.length / 2,
    distanceLabels,
    offsetByPlanetId,
    orderedPlanetIds: orderedPlanets.map((instance) => instance.snapshot.definition.id),
    tickPoints,
  };
}

function getDominantAlignmentDirection(orderedPlanets: PlanetMeshInstance[]): Vector3 {
  const seedDirection = orderedPlanets.reduce((direction, instance) => {
    const sample = instance.currentPosition.lengthSq() > 0
      ? instance.currentPosition.clone().normalize()
      : new Vector3(0, 0, 0);
    return direction.add(sample);
  }, new Vector3(0, 0, 0));

  const dominantPositions = orderedPlanets
    .map((instance) => instance.currentPosition)
    .filter((position) => position.lengthSq() > 0 && position.clone().normalize().dot(seedDirection) >= 0);
  const sourcePositions = dominantPositions.length > 0
    ? dominantPositions
    : orderedPlanets.map((instance) => instance.currentPosition);
  const axisDirection = sourcePositions.reduce((direction, position) => {
    if (position.lengthSq() === 0) {
      return direction;
    }

    return direction.add(position.clone().normalize());
  }, new Vector3(0, 0, 0));

  if (axisDirection.lengthSq() < 1e-6) {
    return orderedPlanets.at(-1)?.currentPosition.clone().normalize() ?? new Vector3(0, 0, -1);
  }

  return axisDirection.normalize();
}

function getStableNormal(axisDirection: Vector3): Vector3 {
  const worldUp = new Vector3(0, 1, 0);
  const fallbackRight = new Vector3(1, 0, 0);
  const tangent = new Vector3().crossVectors(axisDirection, worldUp);

  if (tangent.lengthSq() < 1e-6) {
    tangent.crossVectors(axisDirection, fallbackRight);
  }

  return new Vector3().crossVectors(tangent.normalize(), axisDirection).normalize();
}

function createAlignmentDotPoints(
  axisDirection: Vector3,
  axisLengthAu: number,
  stepAu: number,
): Vector3[] {
  const points: Vector3[] = [];

  for (let distanceAu = 0; distanceAu <= axisLengthAu; distanceAu += stepAu) {
    points.push(axisDirection.clone().multiplyScalar(distanceAu));
  }

  if (points.at(-1)?.distanceTo(axisDirection.clone().multiplyScalar(axisLengthAu)) !== 0) {
    points.push(axisDirection.clone().multiplyScalar(axisLengthAu));
  }

  return points;
}

function toTuple(vector: Vector3): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}
