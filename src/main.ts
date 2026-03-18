import "./styles.css";

import { createControlPanel } from "./controls";
import { TARGET_DATE_LABEL, TARGET_JULIAN_DATE } from "./planets";
import { createPlanetariumScene } from "./scene";
import { createOverlayLayer } from "./ui/overlay";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found");
}

const searchParams = new URLSearchParams(window.location.search);
const testMode = searchParams.get("test") === "1";

document.body.dataset.sceneReady = "false";
document.body.dataset.scaleMode = "visible";
document.body.dataset.testMode = String(testMode);

app.innerHTML = `
  <div class="app-shell">
    <div class="scene-layer" data-scene-root></div>
    <div class="hud" data-hud-root></div>
    <div class="overlay-root" data-overlay-root></div>
  </div>
`;

const sceneRoot = app.querySelector<HTMLElement>("[data-scene-root]");
const hudRoot = app.querySelector<HTMLElement>("[data-hud-root]");
const overlayRoot = app.querySelector<HTMLElement>("[data-overlay-root]");

if (!sceneRoot || !hudRoot || !overlayRoot) {
  throw new Error("Planetarium layout did not initialize correctly");
}

const controls = createControlPanel({
  root: hudRoot,
  dateLabel: TARGET_DATE_LABEL,
  julianDate: TARGET_JULIAN_DATE,
  initialScaleMode: "visible",
});
const overlay = createOverlayLayer({ root: overlayRoot });
const scene = createPlanetariumScene({
  canvasRoot: sceneRoot,
  controls,
  overlay,
  testMode,
});

controls.bindScaleModeChange((mode) => {
  scene.setScaleMode(mode);
});

overlay.bindPlanetSelection((planetId) => {
  scene.selectPlanet(planetId);
});
