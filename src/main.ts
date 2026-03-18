import "./styles.css";

import { createPlanetariumScene } from "./scene";
import { createOverlay } from "./ui/overlay";

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("Expected #app root element");
}

const isTestMode = new URLSearchParams(window.location.search).has("e2e");
const overlay = createOverlay();

appRoot.append(overlay.root);

const sceneApp = createPlanetariumScene(appRoot, {
  testMode: isTestMode,
  onFirstRender: () => overlay.setReady(true),
  onCameraChange: (summary) => overlay.setCameraSummary(summary),
});

window.addEventListener(
  "beforeunload",
  () => {
    sceneApp.destroy();
  },
  { once: true },
);
