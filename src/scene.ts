import {
  AmbientLight,
  Box3,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Raycaster,
  RingGeometry,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

import { createOrbitController, type PlanetariumStore, type ScaleMode } from "./controls";
import {
  PLANET_COORDINATES_2161,
  sortPlanetsByHeliocentricDistance,
  type PlanetName,
  type PlanetState,
} from "./planets";

type PlanetLabel = {
  name: PlanetName;
  x: number;
  y: number;
  hidden: boolean;
};

type DistanceLabel = {
  id: string;
  label: string;
  x: number;
  y: number;
  hidden: boolean;
};

type SceneOptions = {
  mount: HTMLDivElement;
  planets: PlanetState[];
  store: PlanetariumStore;
  testMode: boolean;
  onReady: () => void;
  onPlanetLabels: (labels: PlanetLabel[]) => void;
  onDistanceLabels: (labels: DistanceLabel[]) => void;
};

type PlanetVisual = {
  state: PlanetState;
  mesh: Mesh;
  material: MeshStandardMaterial;
};

export type PlanetariumSnapshot = {
  ready: boolean;
  planetCount: number;
  distanceLabelCount: number;
  scaleMode: ScaleMode;
  selectedPlanet: PlanetName;
  cameraPosition: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  coordinates: typeof PLANET_COORDINATES_2161;
};

const TRUE_DISTANCE_SCALE = 6.2;
const TRUE_RADIUS_SCALE = 7_900;

const vectorScratch = new Vector3();

const createSeededRandom = (seed: number): (() => number) => {
  let current = seed >>> 0;
  return () => {
    current = (current + 0x6d2b79f5) | 0;
    let t = Math.imul(current ^ (current >>> 15), 1 | current);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const createStarfield = (testMode: boolean): Points => {
  const starCount = 900;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const random = createSeededRandom(2161);

  for (let index = 0; index < starCount; index += 1) {
    const radius = 340 + random() * 460;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(1 - random() * 2);
    const brightness = 0.3 + random() * 0.7;

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    positions[index * 3] = x;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = z;

    colors[index * 3] = brightness;
    colors[index * 3 + 1] = brightness;
    colors[index * 3 + 2] = 1;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));

  const material = new PointsMaterial({
    size: testMode ? 1.8 : 1.5,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    vertexColors: true,
  });

  return new Points(geometry, material);
};

const getSceneRadius = (planet: PlanetState, scaleMode: ScaleMode): number => {
  const trueRadius = planet.radiusAu * TRUE_RADIUS_SCALE;
  if (scaleMode === "true") {
    return trueRadius;
  }

  return 0.9 + Math.pow(planet.radiusKilometers / 1_000, 0.55) * 0.26;
};

const getScenePosition = (
  planet: PlanetState,
  scaleMode: ScaleMode,
  target = new Vector3(),
): Vector3 => {
  if (scaleMode === "true") {
    return target.set(
      planet.x * TRUE_DISTANCE_SCALE,
      planet.z * TRUE_DISTANCE_SCALE * 0.92,
      planet.y * TRUE_DISTANCE_SCALE,
    );
  }

  const radialDistance = Math.hypot(planet.x, planet.y, planet.z);
  const compressedDistance = 10 + Math.pow(radialDistance, 0.72) * 16;
  const scaleFactor = compressedDistance / radialDistance;
  return target.set(
    planet.x * scaleFactor,
    planet.z * scaleFactor * 0.92,
    planet.y * scaleFactor,
  );
};

const formatSegmentDistance = (left: PlanetState, right: PlanetState): string =>
  `${Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z).toFixed(2)} AU`;

export const createPlanetariumScene = ({
  mount,
  planets,
  store,
  testMode,
  onReady,
  onPlanetLabels,
  onDistanceLabels,
}: SceneOptions) => {
  const scene = new Scene();
  scene.background = new Color("#05060b");

  const renderer = new WebGLRenderer({
    alpha: false,
    antialias: !testMode,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setPixelRatio(testMode ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor("#05060b");
  renderer.domElement.dataset.testid = "planetarium-canvas";

  mount.append(renderer.domElement);

  const camera = new PerspectiveCamera(42, 1, 0.1, 2_000);
  const controls = createOrbitController(camera, renderer.domElement, testMode);

  const ambientLight = new AmbientLight("#5573a8", 0.7);
  const sunLight = new PointLight("#ffd28d", 8.2, 0, 2);
  sunLight.position.set(0, 0, 0);

  const systemGroup = new Group();
  const planetGroup = new Group();
  const spineLine = new Line(
    new BufferGeometry(),
    new LineBasicMaterial({
      color: "#ffd28d",
      transparent: true,
      opacity: 0.8,
    }),
  );

  const sun = new Mesh(
    new SphereGeometry(7.6, testMode ? 18 : 32, testMode ? 18 : 32),
    new MeshBasicMaterial({
      color: "#ffcf7a",
    }),
  );

  const halo = new Mesh(
    new RingGeometry(9.5, 24, 64),
    new MeshBasicMaterial({
      color: "#ffb566",
      transparent: true,
      opacity: 0.2,
      side: 2,
    }),
  );
  halo.rotation.x = Math.PI / 2;

  scene.add(createStarfield(testMode));
  scene.add(ambientLight, sunLight);
  scene.add(systemGroup);
  systemGroup.add(sun, halo, planetGroup, spineLine);

  const sphereGeometry = new SphereGeometry(1, testMode ? 18 : 28, testMode ? 18 : 28);

  const planetVisuals: PlanetVisual[] = planets.map((planet) => {
    const material = new MeshStandardMaterial({
      color: planet.color,
      emissive: new Color(planet.accent),
      emissiveIntensity: 0.18,
      roughness: 0.84,
      metalness: 0.06,
    });

    const mesh = new Mesh(sphereGeometry, material);
    mesh.name = planet.name;
    planetGroup.add(mesh);

    if (planet.name === "Saturn") {
      const rings = new Mesh(
        new RingGeometry(1.35, 2.35, 64),
        new MeshBasicMaterial({
          color: "#f5e0ab",
          transparent: true,
          opacity: 0.65,
          side: 2,
        }),
      );
      rings.rotation.x = Math.PI / 2;
      mesh.add(rings);
    }

    return {
      state: planet,
      mesh,
      material,
    };
  });

  const clickableMeshes = planetVisuals.map((visual) => visual.mesh);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const spineOrder = sortPlanetsByHeliocentricDistance(planets);

  const visibleBounds = new Box3().setFromPoints(
    planets.map((planet) => getScenePosition(planet, "visible")),
  );
  const visibleCenter = visibleBounds.getCenter(new Vector3());
  const visibleSize = visibleBounds.getSize(new Vector3());
  const baseDistance = Math.max(visibleSize.length(), 140);

  camera.position.set(
    visibleCenter.x - baseDistance * 0.75,
    visibleCenter.y + baseDistance * 0.55,
    visibleCenter.z + baseDistance * 1.1,
  );
  controls.target.copy(visibleCenter.clone().lerp(new Vector3(0, 0, 0), 0.2));
  controls.update();

  const resize = (): void => {
    const width = Math.max(mount.clientWidth, 1);
    const height = Math.max(mount.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  resize();
  window.addEventListener("resize", resize);

  const updatePointer = (event: PointerEvent): void => {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  };

  const pickPlanet = (): PlanetName | null => {
    raycaster.setFromCamera(pointer, camera);
    const intersections = raycaster.intersectObjects(clickableMeshes, false);
    const firstHit = intersections[0];
    return firstHit ? (firstHit.object.name as PlanetName) : null;
  };

  const handlePointerMove = (event: PointerEvent): void => {
    updatePointer(event);
    mount.style.cursor = pickPlanet() ? "pointer" : "grab";
  };

  const handleClick = (event: MouseEvent): void => {
    updatePointer(event as PointerEvent);
    const planetName = pickPlanet();
    if (planetName) {
      store.setSelectedPlanet(planetName);
    }
  };

  renderer.domElement.addEventListener("pointermove", handlePointerMove);
  renderer.domElement.addEventListener("click", handleClick);

  let ready = false;
  let animationFrame = 0;

  const updateLabels = (): void => {
    const width = renderer.domElement.clientWidth;
    const height = renderer.domElement.clientHeight;
    const planetLabels: PlanetLabel[] = [];

    for (const visual of planetVisuals) {
      const projected = visual.mesh.position.clone().project(camera);
      const hidden =
        projected.z < -1 ||
        projected.z > 1 ||
        Math.abs(projected.x) > 1.3 ||
        Math.abs(projected.y) > 1.3;

      planetLabels.push({
        name: visual.state.name,
        x: ((projected.x + 1) * 0.5) * width,
        y: ((1 - projected.y) * 0.5) * height,
        hidden,
      });
    }

    const distanceLabels: DistanceLabel[] = [];
    for (let index = 0; index < spineOrder.length - 1; index += 1) {
      const left = planetVisuals.find((visual) => visual.state.name === spineOrder[index].name);
      const right = planetVisuals.find(
        (visual) => visual.state.name === spineOrder[index + 1].name,
      );

      if (!left || !right) {
        continue;
      }

      const midpoint = left.mesh.position.clone().lerp(right.mesh.position, 0.5);
      const projected = midpoint.project(camera);
      const hidden =
        projected.z < -1 ||
        projected.z > 1 ||
        Math.abs(projected.x) > 1.2 ||
        Math.abs(projected.y) > 1.2;

      distanceLabels.push({
        id: String(index),
        label: formatSegmentDistance(spineOrder[index], spineOrder[index + 1]),
        x: ((projected.x + 1) * 0.5) * width,
        y: ((1 - projected.y) * 0.5) * height,
        hidden,
      });
    }

    onPlanetLabels(planetLabels);
    onDistanceLabels(distanceLabels);
  };

  const updateScene = (): void => {
    const { scaleMode, selectedPlanet } = store.snapshot;
    const linePoints: Vector3[] = [];

    for (const visual of planetVisuals) {
      const targetPosition = getScenePosition(visual.state, scaleMode, vectorScratch.clone());
      const selectedBoost = visual.state.name === selectedPlanet ? 1.16 : 1;
      const targetRadius = getSceneRadius(visual.state, scaleMode) * selectedBoost;

      if (testMode) {
        visual.mesh.position.copy(targetPosition);
        visual.mesh.scale.setScalar(targetRadius);
      } else {
        visual.mesh.position.lerp(targetPosition, 0.14);
        const nextScale = MathUtils.lerp(visual.mesh.scale.x || 0, targetRadius, 0.14);
        visual.mesh.scale.setScalar(nextScale);
      }

      visual.material.emissiveIntensity =
        visual.state.name === selectedPlanet ? 0.45 : 0.16;
    }

    for (const planet of spineOrder) {
      const visual = planetVisuals.find((entry) => entry.state.name === planet.name);
      if (visual) {
        linePoints.push(visual.mesh.position.clone());
      }
    }

    spineLine.geometry.setFromPoints(linePoints);
    controls.update();
    updateLabels();
  };

  const tick = (): void => {
    updateScene();
    renderer.render(scene, camera);

    if (!ready) {
      ready = true;
      document.documentElement.dataset.sceneReady = "true";
      onReady();
    }

    animationFrame = window.requestAnimationFrame(tick);
  };

  animationFrame = window.requestAnimationFrame(tick);

  return {
    getSnapshot: (): PlanetariumSnapshot => ({
      ready,
      planetCount: planets.length,
      distanceLabelCount: spineOrder.length - 1,
      scaleMode: store.snapshot.scaleMode,
      selectedPlanet: store.snapshot.selectedPlanet,
      cameraPosition: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      },
      target: {
        x: controls.target.x,
        y: controls.target.y,
        z: controls.target.z,
      },
      coordinates: PLANET_COORDINATES_2161,
    }),
    dispose: (): void => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("click", handleClick);
      controls.dispose();
      renderer.dispose();
    },
  };
};
