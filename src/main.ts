import "./styles.css";

import { PlanetariumStore } from "./controls";
import { ALIGNMENT_JULIAN_DATE, PLANET_COORDINATES_2161, PLANET_STATES_2161 } from "./planets";
import { createPlanetariumScene, type PlanetariumSnapshot } from "./scene";
import { createOverlay } from "./ui/overlay";

type PlanetariumRuntimeApi = {
  ready: boolean;
  coordinates: typeof PLANET_COORDINATES_2161;
  setScaleMode: (scaleMode: "visible" | "true") => void;
  selectPlanet: (planetName: (typeof PLANET_COORDINATES_2161)[number]["name"]) => void;
  getSnapshot: () => PlanetariumSnapshot;
};

declare global {
  interface Window {
    __PLANETARIUM__?: PlanetariumRuntimeApi;
  }
}

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Missing #app mount");
}

document.documentElement.dataset.sceneReady = "false";

const searchParams = new URLSearchParams(window.location.search);
const testMode = searchParams.get("test") === "1";

const store = new PlanetariumStore({
  scaleMode: "visible",
  selectedPlanet: "Earth",
});

const overlay = createOverlay(root, PLANET_STATES_2161, store, {
  julianDate: ALIGNMENT_JULIAN_DATE,
  testMode,
});

const scene = createPlanetariumScene({
  mount: overlay.stageMount,
  planets: PLANET_STATES_2161,
  store,
  testMode,
  onReady: () => {
    overlay.setReady();
    if (window.__PLANETARIUM__) {
      window.__PLANETARIUM__.ready = true;
    }
  },
  onPlanetLabels: overlay.updatePlanetLabels,
  onDistanceLabels: overlay.updateDistanceLabels,
});

window.__PLANETARIUM__ = {
  ready: false,
  coordinates: PLANET_COORDINATES_2161,
  setScaleMode: (scaleMode) => {
    store.setScaleMode(scaleMode);
  },
  selectPlanet: (planetName) => {
    store.setSelectedPlanet(planetName);
  },
  getSnapshot: () => scene.getSnapshot(),
};

window.addEventListener(
  "beforeunload",
  () => {
    overlay.dispose();
    scene.dispose();
  },
  { once: true },
);
