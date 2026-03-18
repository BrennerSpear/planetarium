import type { PlanetariumStore, ScaleMode } from "../controls";
import type { PlanetName, PlanetState } from "../planets";

type PlanetScreenLabel = {
  name: PlanetName;
  x: number;
  y: number;
  hidden: boolean;
};

type DistanceScreenLabel = {
  id: string;
  label: string;
  x: number;
  y: number;
  hidden: boolean;
};

type OverlayOptions = {
  julianDate: number;
  testMode: boolean;
};

export type PlanetariumOverlay = {
  stageMount: HTMLDivElement;
  setReady: () => void;
  updatePlanetLabels: (labels: PlanetScreenLabel[]) => void;
  updateDistanceLabels: (labels: DistanceScreenLabel[]) => void;
  dispose: () => void;
};

const slugifyPlanet = (planetName: PlanetName): string =>
  planetName.toLowerCase().replace(/\s+/g, "-");

const formatCoordinate = (value: number): string => value.toFixed(3);

const formatDistance = (value: number): string => `${value.toFixed(2)} AU`;

export const createOverlay = (
  root: HTMLElement,
  planets: PlanetState[],
  store: PlanetariumStore,
  options: OverlayOptions,
): PlanetariumOverlay => {
  root.innerHTML = "";

  const appShell = document.createElement("div");
  appShell.className = "app-shell";

  const cosmicBackdrop = document.createElement("div");
  cosmicBackdrop.className = "cosmic-backdrop";

  const stageFrame = document.createElement("div");
  stageFrame.className = "scene-frame";
  stageFrame.dataset.testid = "scene-stage";

  const stageMount = document.createElement("div");
  stageMount.className = "scene-mount";

  const labelLayer = document.createElement("div");
  labelLayer.className = "label-layer";

  const statusCard = document.createElement("section");
  statusCard.className = "panel panel-summary";

  const eyebrow = document.createElement("div");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Planetarium";

  const heading = document.createElement("h1");
  heading.className = "hero-title";
  heading.textContent = "May 19, 2161 alignment";

  const summary = document.createElement("p");
  summary.className = "hero-copy";
  summary.textContent =
    "Heliocentric positions are derived from JPL J2000 orbital elements, solved through Kepler’s equation, and staged here in AU-aware 3D.";

  const statusRow = document.createElement("div");
  statusRow.className = "status-row";

  const sceneStatus = document.createElement("span");
  sceneStatus.className = "status-pill";
  sceneStatus.dataset.testid = "scene-status";
  sceneStatus.textContent = "Initializing scene";

  const julianBadge = document.createElement("span");
  julianBadge.className = "status-pill status-pill-subtle";
  julianBadge.textContent = `JD ${options.julianDate.toFixed(1)}`;

  const testBadge = document.createElement("span");
  testBadge.className = "status-pill status-pill-subtle";
  testBadge.textContent = options.testMode ? "Test mode fixed" : "Live orbit view";

  statusRow.append(sceneStatus, julianBadge, testBadge);
  statusCard.append(eyebrow, heading, summary, statusRow);

  const controlsCard = document.createElement("section");
  controlsCard.className = "panel panel-controls";

  const controlsHeading = document.createElement("h2");
  controlsHeading.className = "panel-title";
  controlsHeading.textContent = "Scale + targets";

  const scaleGroup = document.createElement("div");
  scaleGroup.className = "toggle-group";

  const visibleButton = document.createElement("button");
  visibleButton.type = "button";
  visibleButton.className = "toggle-button";
  visibleButton.dataset.testid = "scale-mode-visible";
  visibleButton.textContent = "Visible scale";
  visibleButton.addEventListener("click", () => {
    store.setScaleMode("visible");
  });

  const trueButton = document.createElement("button");
  trueButton.type = "button";
  trueButton.className = "toggle-button";
  trueButton.dataset.testid = "scale-mode-true";
  trueButton.textContent = "True scale";
  trueButton.addEventListener("click", () => {
    store.setScaleMode("true");
  });

  scaleGroup.append(visibleButton, trueButton);

  const planetButtonGrid = document.createElement("div");
  planetButtonGrid.className = "planet-button-grid";

  const buttonByPlanet = new Map<PlanetName, HTMLButtonElement>();
  for (const planet of planets) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "planet-chip";
    button.dataset.testid = `planet-button-${slugifyPlanet(planet.name)}`;
    button.textContent = planet.name;
    button.style.setProperty("--planet-accent", planet.accent);
    button.addEventListener("click", () => {
      store.setSelectedPlanet(planet.name);
    });
    buttonByPlanet.set(planet.name, button);
    planetButtonGrid.append(button);
  }

  controlsCard.append(controlsHeading, scaleGroup, planetButtonGrid);

  const infoCard = document.createElement("section");
  infoCard.className = "panel panel-info";
  infoCard.dataset.testid = "planet-info";

  const infoHeading = document.createElement("h2");
  infoHeading.className = "panel-title";
  infoHeading.textContent = "Planet detail";

  const infoPlanet = document.createElement("h3");
  infoPlanet.className = "planet-detail-name";

  const infoBlurb = document.createElement("p");
  infoBlurb.className = "planet-detail-copy";

  const metricGrid = document.createElement("dl");
  metricGrid.className = "metric-grid";

  const metricDistanceLabel = document.createElement("dt");
  metricDistanceLabel.textContent = "Sun distance";
  const metricDistanceValue = document.createElement("dd");

  const metricCoordinateLabel = document.createElement("dt");
  metricCoordinateLabel.textContent = "Coordinates";
  const metricCoordinateValue = document.createElement("dd");

  const metricEccentricityLabel = document.createElement("dt");
  metricEccentricityLabel.textContent = "Eccentricity";
  const metricEccentricityValue = document.createElement("dd");

  const metricInclinationLabel = document.createElement("dt");
  metricInclinationLabel.textContent = "Inclination";
  const metricInclinationValue = document.createElement("dd");

  metricGrid.append(
    metricDistanceLabel,
    metricDistanceValue,
    metricCoordinateLabel,
    metricCoordinateValue,
    metricEccentricityLabel,
    metricEccentricityValue,
    metricInclinationLabel,
    metricInclinationValue,
  );

  infoCard.append(infoHeading, infoPlanet, infoBlurb, metricGrid);

  const screenLabelButtons = new Map<PlanetName, HTMLButtonElement>();
  for (const planet of planets) {
    const label = document.createElement("button");
    label.type = "button";
    label.className = "screen-label";
    label.textContent = planet.name;
    label.style.setProperty("--planet-accent", planet.accent);
    label.addEventListener("click", () => {
      store.setSelectedPlanet(planet.name);
    });
    screenLabelButtons.set(planet.name, label);
    labelLayer.append(label);
  }

  const distanceLabels = new Map<string, HTMLDivElement>();
  for (let index = 0; index < planets.length - 1; index += 1) {
    const label = document.createElement("div");
    label.className = "distance-label";
    label.dataset.testid = `distance-label-${index}`;
    distanceLabels.set(String(index), label);
    labelLayer.append(label);
  }

  stageFrame.append(stageMount, labelLayer);
  appShell.append(cosmicBackdrop, stageFrame, statusCard, controlsCard, infoCard);
  root.append(appShell);

  const planetMap = new Map(planets.map((planet) => [planet.name, planet]));

  const renderState = (scaleMode: ScaleMode, selectedPlanetName: PlanetName): void => {
    visibleButton.setAttribute("aria-pressed", String(scaleMode === "visible"));
    trueButton.setAttribute("aria-pressed", String(scaleMode === "true"));

    visibleButton.classList.toggle("is-active", scaleMode === "visible");
    trueButton.classList.toggle("is-active", scaleMode === "true");

    for (const [planetName, button] of buttonByPlanet) {
      button.classList.toggle("is-active", planetName === selectedPlanetName);
    }

    for (const [planetName, label] of screenLabelButtons) {
      label.classList.toggle("is-active", planetName === selectedPlanetName);
    }

    const selectedPlanet = planetMap.get(selectedPlanetName);
    if (!selectedPlanet) {
      return;
    }

    infoPlanet.textContent = selectedPlanet.name;
    infoBlurb.textContent = selectedPlanet.blurb;
    metricDistanceValue.textContent = formatDistance(selectedPlanet.distanceFromSunAu);
    metricCoordinateValue.textContent = `(${formatCoordinate(selectedPlanet.x)}, ${formatCoordinate(selectedPlanet.y)}, ${formatCoordinate(selectedPlanet.z)}) AU`;
    metricEccentricityValue.textContent = selectedPlanet.eccentricity.toFixed(4);
    metricInclinationValue.textContent = `${selectedPlanet.inclinationDeg.toFixed(2)}°`;
  };

  const unsubscribe = store.subscribe(({ scaleMode, selectedPlanet }) => {
    renderState(scaleMode, selectedPlanet);
  });

  return {
    stageMount,
    setReady: () => {
      sceneStatus.textContent = "Scene ready";
    },
    updatePlanetLabels: (labels) => {
      for (const label of labels) {
        const button = screenLabelButtons.get(label.name);
        if (!button) {
          continue;
        }

        button.style.left = `${label.x}px`;
        button.style.top = `${label.y}px`;
        button.classList.toggle("is-hidden", label.hidden);
      }
    },
    updateDistanceLabels: (labels) => {
      for (const label of labels) {
        const distanceLabel = distanceLabels.get(label.id);
        if (!distanceLabel) {
          continue;
        }

        distanceLabel.textContent = label.label;
        distanceLabel.style.left = `${label.x}px`;
        distanceLabel.style.top = `${label.y}px`;
        distanceLabel.classList.toggle("is-hidden", label.hidden);
      }
    },
    dispose: () => {
      unsubscribe();
    },
  };
};
