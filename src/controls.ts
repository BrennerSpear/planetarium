import { PerspectiveCamera } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { PlanetName } from "./planets";

export type ScaleMode = "visible" | "true";

export type PlanetariumState = {
  scaleMode: ScaleMode;
  selectedPlanet: PlanetName;
};

type StateListener = (state: PlanetariumState) => void;

export class PlanetariumStore {
  private state: PlanetariumState;

  private listeners = new Set<StateListener>();

  constructor(initialState: PlanetariumState) {
    this.state = initialState;
  }

  get snapshot(): PlanetariumState {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setScaleMode(scaleMode: ScaleMode): void {
    if (this.state.scaleMode === scaleMode) {
      return;
    }
    this.state = {
      ...this.state,
      scaleMode,
    };
    this.emit();
  }

  setSelectedPlanet(selectedPlanet: PlanetName): void {
    if (this.state.selectedPlanet === selectedPlanet) {
      return;
    }
    this.state = {
      ...this.state,
      selectedPlanet,
    };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

export const createOrbitController = (
  camera: PerspectiveCamera,
  domElement: HTMLCanvasElement,
  testMode: boolean,
): OrbitControls => {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = !testMode;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.8;
  controls.panSpeed = 0.85;
  controls.minDistance = 20;
  controls.maxDistance = 900;
  return controls;
};
