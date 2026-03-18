import type { PlanetSnapshot, ScaleMode } from "./planets";
import { formatDistanceAu, formatDistanceMillionKm } from "./planets";

type ScaleModeChangeHandler = (mode: ScaleMode) => void;

export interface ControlPanel {
  bindScaleModeChange(handler: ScaleModeChangeHandler): void;
  setScaleMode(mode: ScaleMode): void;
  updateFocus(snapshot: PlanetSnapshot | null, source: "hover" | "selected" | "none"): void;
}

interface ControlPanelOptions {
  root: HTMLElement;
  dateLabel: string;
  julianDate: number;
  initialScaleMode: ScaleMode;
}

export function createControlPanel(options: ControlPanelOptions): ControlPanel {
  const root = options.root;
  const scaleHandlers: ScaleModeChangeHandler[] = [];

  root.innerHTML = `
    <section class="panel brand-panel">
      <p class="eyebrow">Planetarium</p>
      <h1>Solar alignment in three dimensions</h1>
      <p class="lede">
        Approximate heliocentric positions for <strong>${options.dateLabel}</strong>.
        Exact Julian date: <strong>${options.julianDate.toFixed(1)}</strong>.
      </p>
    </section>

    <section class="panel controls-panel">
      <div class="panel-heading">
        <h2>Scale</h2>
        <p>Switch between physically tiny planets and an explorable visible mode.</p>
      </div>
      <div class="toggle-row" data-scale-toggle-row>
        <button type="button" class="toggle-button" data-scale-toggle="visible">Visible scale</button>
        <button type="button" class="toggle-button" data-scale-toggle="true">True scale</button>
      </div>
      <p class="helper-copy">
        The issue description listed a different Julian date; the scene uses the exact converted value for May 19, 2161.
      </p>
    </section>

    <section class="panel info-panel">
      <div class="panel-heading">
        <h2 data-focus-heading>Hover or select a planet</h2>
        <p data-focus-subheading>Labels and the 3D scene both drive the same info card.</p>
      </div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Category</span>
          <span class="info-value" data-info-category>Alignment target</span>
        </div>
        <div class="info-item">
          <span class="info-label">Heliocentric distance</span>
          <span class="info-value" data-info-distance>9 planets along the same side of the Sun.</span>
        </div>
        <div class="info-item">
          <span class="info-label">Radius</span>
          <span class="info-value" data-info-radius>Scale-correct radii relative to one another.</span>
        </div>
        <div class="info-item">
          <span class="info-label">Orbital period</span>
          <span class="info-value" data-info-period>Derived from the orbital elements.</span>
        </div>
        <div class="info-item">
          <span class="info-label">Mean anomaly</span>
          <span class="info-value" data-info-anomaly>Computed from the JPL element set.</span>
        </div>
        <div class="info-item">
          <span class="info-label">Source note</span>
          <span class="info-value" data-info-note>JPL approximation table plus a Pluto fallback from JPL SBDB.</span>
        </div>
      </div>
    </section>

    <section class="panel footer-panel">
      <div>
        <p class="eyebrow">Guide</p>
        <p class="lede compact">
          The dashed axis runs from the Sun toward the alignment and out past Pluto, while the AU markers show the
          radial spacing between adjacent worlds along that guide.
        </p>
      </div>
    </section>
  `;

  const visibleButton = root.querySelector<HTMLButtonElement>("[data-scale-toggle='visible']");
  const trueButton = root.querySelector<HTMLButtonElement>("[data-scale-toggle='true']");

  if (!visibleButton || !trueButton) {
    throw new Error("Scale controls did not initialize");
  }

  const focusHeading = root.querySelector<HTMLElement>("[data-focus-heading]");
  const focusSubheading = root.querySelector<HTMLElement>("[data-focus-subheading]");
  const categoryValue = root.querySelector<HTMLElement>("[data-info-category]");
  const distanceValue = root.querySelector<HTMLElement>("[data-info-distance]");
  const radiusValue = root.querySelector<HTMLElement>("[data-info-radius]");
  const periodValue = root.querySelector<HTMLElement>("[data-info-period]");
  const anomalyValue = root.querySelector<HTMLElement>("[data-info-anomaly]");
  const noteValue = root.querySelector<HTMLElement>("[data-info-note]");

  if (
    !focusHeading
    || !focusSubheading
    || !categoryValue
    || !distanceValue
    || !radiusValue
    || !periodValue
    || !anomalyValue
    || !noteValue
  ) {
    throw new Error("Info panel did not initialize");
  }

  const buttons = new Map<ScaleMode, HTMLButtonElement>([
    ["visible", visibleButton],
    ["true", trueButton],
  ]);

  const applyScaleMode = (mode: ScaleMode) => {
    document.body.dataset.scaleMode = mode;

    for (const [buttonMode, button] of buttons) {
      const isActive = mode === buttonMode;
      button.dataset.active = String(isActive);
      button.setAttribute("aria-pressed", String(isActive));
    }
  };

  for (const [mode, button] of buttons) {
    button.addEventListener("click", () => {
      applyScaleMode(mode);

      for (const handler of scaleHandlers) {
        handler(mode);
      }
    });
  }

  applyScaleMode(options.initialScaleMode);

  return {
    bindScaleModeChange(handler) {
      scaleHandlers.push(handler);
    },
    setScaleMode(mode) {
      applyScaleMode(mode);
    },
    updateFocus(snapshot, source) {
      if (!snapshot) {
        focusHeading.textContent = "Hover or select a planet";
        focusSubheading.textContent = "Labels and the 3D scene both drive the same info card.";
        categoryValue.textContent = "Alignment target";
        distanceValue.textContent = "9 planets along the same side of the Sun.";
        radiusValue.textContent = "Scale-correct radii relative to one another.";
        periodValue.textContent = "Derived from the orbital elements.";
        anomalyValue.textContent = "Computed from the JPL element set.";
        noteValue.textContent = "JPL approximation table plus a Pluto fallback from JPL SBDB.";
        document.body.dataset.selectedPlanet = "";
        return;
      }

      focusHeading.textContent = snapshot.definition.label;
      focusSubheading.textContent = source === "selected"
        ? "Selection pinned from a click."
        : "Previewing the current hover target.";
      categoryValue.textContent = snapshot.definition.category;
      distanceValue.textContent = `${formatDistanceAu(snapshot.heliocentricDistanceAu)} (${formatDistanceMillionKm(snapshot.heliocentricDistanceAu)})`;
      radiusValue.textContent = `${snapshot.definition.radiusKm.toLocaleString()} km`;
      periodValue.textContent = `${snapshot.orbitalPeriodYears.toFixed(1)} years`;
      anomalyValue.textContent = `${snapshot.meanAnomalyDeg.toFixed(1)}°`;
      noteValue.textContent = snapshot.definition.note ?? "Position derived from the JPL approximation model.";
      document.body.dataset.selectedPlanet = source === "selected" ? snapshot.definition.id : "";
    },
  };
}
