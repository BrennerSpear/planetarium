import type { PlanetSnapshot } from "./planets";
import { formatDistanceAu, formatDistanceMillionKm } from "./planets";
import { HISTORICAL_RANKINGS } from "./rankings";

export interface ControlPanel {
  updateFocus(snapshot: PlanetSnapshot | null, source: "hover" | "selected" | "none"): void;
}

interface ControlPanelOptions {
  root: HTMLElement;
  dateLabel: string;
  julianDate: number;
}

interface InfoSlotCopy {
  label: string;
  value: string;
}

type SidebarMode = "mobile" | "desktop";

const PLANET_INFO_LABELS = {
  category: "Category",
  distance: "Heliocentric distance",
  radius: "Radius",
  period: "Orbital period",
  anomaly: "Mean anomaly",
  note: "Source note",
} as const;

function getDefaultInfoCopy(dateLabel: string): Record<keyof typeof PLANET_INFO_LABELS, InfoSlotCopy> {
  return {
    category: {
      label: "Date",
      value: dateLabel,
    },
    distance: {
      label: "Alignment",
      value: "All eight planets share the same side of the Sun, arranged outward by heliocentric distance.",
    },
    radius: {
      label: "Scale",
      value: "Planet sizes are tuned for legibility so the full alignment remains readable at solar-system distances.",
    },
    period: {
      label: "Interaction",
      value: "Hover labels for a preview, click a planet to pin it, then drag, zoom, or pan the scene.",
    },
    anomaly: {
      label: "View",
      value: "Orbit rings and floating planet names stay visible while you explore the lineup from any angle.",
    },
    note: {
      label: "Source",
      value: "Positions are computed from JPL orbital elements.",
    },
  };
}

export function createControlPanel(options: ControlPanelOptions): ControlPanel {
  const root = options.root;
  const defaultInfoCopy = getDefaultInfoCopy(options.dateLabel);
  const compactDateLabel = options.dateLabel.toUpperCase();
  const rankingsRows = HISTORICAL_RANKINGS.map((ranking) => `
    <tr
      class="rankings-row"
      data-rankings-row
      data-current="${String(Boolean(ranking.isCurrent))}"
      data-tightest="${String(Boolean(ranking.isTightest))}"
    >
      <td>${ranking.rankLabel}</td>
      <td>
        <div class="rankings-date-cell">
          <span>${ranking.dateLabel}</span>
          ${ranking.isCurrent ? '<span class="rankings-badge">★ You are here</span>' : ""}
        </div>
      </td>
      <td>${ranking.spreadLabel}</td>
    </tr>
  `).join("");

  root.innerHTML = `
    <div class="hud-chrome" data-sidebar-chrome>
      <button
        class="sidebar-toggle"
        type="button"
        data-sidebar-toggle
        aria-controls="planetarium-sidebar"
      >
        <span class="sidebar-toggle-icon" data-sidebar-toggle-icon aria-hidden="true"></span>
      </button>
      <div class="sidebar-date-pill" data-sidebar-date-pill>
        <span class="sidebar-date-label">Planetarium</span>
        <span class="sidebar-date-title">${compactDateLabel}</span>
      </div>
    </div>

    <aside class="sidebar" id="planetarium-sidebar" data-sidebar>
      <section class="panel brand-panel">
        <p class="eyebrow">Planetarium</p>
        <p class="brand-date" data-brand-date>${compactDateLabel}</p>
        <h1>Solar alignment in three dimensions</h1>
        <p class="lede">
          Approximate heliocentric positions for <strong>${options.dateLabel}</strong>.
          Exact Julian date: <strong>${options.julianDate.toFixed(1)}</strong>.
        </p>
      </section>

      <section class="panel info-panel" data-focus-source="none">
        <div class="panel-heading">
          <div class="focus-heading-row">
            <span class="focus-accent" data-focus-accent hidden></span>
            <div class="focus-heading-copy">
              <h2 data-focus-heading>The 2161 alignment</h2>
              <p data-focus-subheading>
                Approximate heliocentric positions for <strong>${options.dateLabel}</strong>, when all eight planets gather on one side of the Sun.
              </p>
            </div>
          </div>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label" data-info-category-label>${defaultInfoCopy.category.label}</span>
            <span class="info-value" data-info-category>${defaultInfoCopy.category.value}</span>
          </div>
          <div class="info-item">
            <span class="info-label" data-info-distance-label>${defaultInfoCopy.distance.label}</span>
            <span class="info-value" data-info-distance>${defaultInfoCopy.distance.value}</span>
          </div>
          <div class="info-item">
            <span class="info-label" data-info-radius-label>${defaultInfoCopy.radius.label}</span>
            <span class="info-value" data-info-radius>${defaultInfoCopy.radius.value}</span>
          </div>
          <div class="info-item">
            <span class="info-label" data-info-period-label>${defaultInfoCopy.period.label}</span>
            <span class="info-value" data-info-period>${defaultInfoCopy.period.value}</span>
          </div>
          <div class="info-item">
            <span class="info-label" data-info-anomaly-label>${defaultInfoCopy.anomaly.label}</span>
            <span class="info-value" data-info-anomaly>${defaultInfoCopy.anomaly.value}</span>
          </div>
          <div class="info-item">
            <span class="info-label" data-info-note-label>${defaultInfoCopy.note.label}</span>
            <span class="info-value" data-info-note>${defaultInfoCopy.note.value}</span>
          </div>
        </div>
      </section>

      <section class="panel rankings-panel">
        <details class="rankings-disclosure" data-rankings-disclosure>
          <summary class="rankings-summary" data-rankings-toggle>
            <span class="rankings-summary-label">📊 Historical Rankings (Top 15)</span>
            <span class="rankings-chevron" aria-hidden="true"></span>
          </summary>
          <div class="rankings-content">
            <div class="rankings-table-wrap">
              <table class="rankings-table" data-rankings-table>
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Date</th>
                    <th scope="col">Spread</th>
                  </tr>
                </thead>
                <tbody>
                  ${rankingsRows}
                </tbody>
              </table>
            </div>
            <p class="rankings-footnote" data-rankings-footnote>
              Computed from JPL Keplerian elements (J2000 epoch). Spread = minimum arc containing all 8 planets.
            </p>
          </div>
        </details>
      </section>

      <section class="panel footer-panel">
        <div>
          <p class="eyebrow">Guide</p>
          <p class="lede compact">
            Floating planet names and faint orbital rings keep the alignment legible while you pan, orbit, and zoom.
          </p>
        </div>
      </section>
    </aside>
  `;

  const sidebar = root.querySelector<HTMLElement>("[data-sidebar]");
  const sidebarToggle = root.querySelector<HTMLButtonElement>("[data-sidebar-toggle]");
  const sidebarToggleIcon = root.querySelector<HTMLElement>("[data-sidebar-toggle-icon]");
  const sidebarDatePill = root.querySelector<HTMLElement>("[data-sidebar-date-pill]");
  const infoPanel = root.querySelector<HTMLElement>(".info-panel");
  const focusHeading = root.querySelector<HTMLElement>("[data-focus-heading]");
  const focusSubheading = root.querySelector<HTMLElement>("[data-focus-subheading]");
  const focusAccent = root.querySelector<HTMLElement>("[data-focus-accent]");
  const categoryLabel = root.querySelector<HTMLElement>("[data-info-category-label]");
  const categoryValue = root.querySelector<HTMLElement>("[data-info-category]");
  const distanceLabel = root.querySelector<HTMLElement>("[data-info-distance-label]");
  const distanceValue = root.querySelector<HTMLElement>("[data-info-distance]");
  const radiusLabel = root.querySelector<HTMLElement>("[data-info-radius-label]");
  const radiusValue = root.querySelector<HTMLElement>("[data-info-radius]");
  const periodLabel = root.querySelector<HTMLElement>("[data-info-period-label]");
  const periodValue = root.querySelector<HTMLElement>("[data-info-period]");
  const anomalyLabel = root.querySelector<HTMLElement>("[data-info-anomaly-label]");
  const anomalyValue = root.querySelector<HTMLElement>("[data-info-anomaly]");
  const noteLabel = root.querySelector<HTMLElement>("[data-info-note-label]");
  const noteValue = root.querySelector<HTMLElement>("[data-info-note]");

  if (
    !sidebar
    || !sidebarToggle
    || !sidebarToggleIcon
    || !sidebarDatePill
    || !infoPanel
    || !focusHeading
    || !focusSubheading
    || !focusAccent
    || !categoryLabel
    || !categoryValue
    || !distanceLabel
    || !distanceValue
    || !radiusLabel
    || !radiusValue
    || !periodLabel
    || !periodValue
    || !anomalyLabel
    || !anomalyValue
    || !noteLabel
    || !noteValue
  ) {
    throw new Error("Info panel did not initialize");
  }

  const sidebarMediaQuery = window.matchMedia("(max-width: 899px)");
  const sidebarPreferenceByMode: Record<SidebarMode, boolean | null> = {
    mobile: null,
    desktop: null,
  };
  let sidebarMode: SidebarMode = sidebarMediaQuery.matches ? "mobile" : "desktop";
  let sidebarOpen = sidebarMode === "desktop";

  const applySidebarState = (nextOpen: boolean) => {
    sidebarOpen = nextOpen;
    root.dataset.sidebarMode = sidebarMode;
    root.dataset.sidebarOpen = String(sidebarOpen);
    sidebar.dataset.sidebarMode = sidebarMode;
    sidebar.dataset.sidebarOpen = String(sidebarOpen);
    sidebar.setAttribute("aria-hidden", String(!sidebarOpen));
    sidebar.inert = !sidebarOpen;
    sidebarToggle.dataset.sidebarOpen = String(sidebarOpen);
    sidebarToggle.setAttribute("aria-expanded", String(sidebarOpen));
    sidebarToggle.setAttribute("aria-label", sidebarOpen ? "Hide sidebar" : "Show sidebar");
    sidebarToggleIcon.textContent = sidebarOpen ? "×" : "☰";
    sidebarDatePill.dataset.sidebarOpen = String(sidebarOpen);
    sidebarDatePill.setAttribute("aria-hidden", String(sidebarOpen));
    document.body.dataset.sidebarMode = sidebarMode;
    document.body.dataset.sidebarOpen = String(sidebarOpen);
  };

  const syncSidebarMode = () => {
    const nextMode: SidebarMode = sidebarMediaQuery.matches ? "mobile" : "desktop";

    if (nextMode !== sidebarMode) {
      sidebarMode = nextMode;
      const storedPreference = sidebarPreferenceByMode[sidebarMode];
      applySidebarState(storedPreference ?? (sidebarMode === "desktop"));
      return;
    }

    applySidebarState(sidebarOpen);
  };

  sidebarToggle.addEventListener("click", () => {
    const nextOpen = !sidebarOpen;

    sidebarPreferenceByMode[sidebarMode] = nextOpen;
    applySidebarState(nextOpen);
  });

  if (typeof sidebarMediaQuery.addEventListener === "function") {
    sidebarMediaQuery.addEventListener("change", syncSidebarMode);
  } else {
    sidebarMediaQuery.addListener(syncSidebarMode);
  }

  syncSidebarMode();

  const resetFocusAccent = () => {
    focusAccent.hidden = true;
    focusAccent.style.backgroundColor = "";
    infoPanel.dataset.focusSource = "none";
    infoPanel.style.borderColor = "";
  };

  const applyDefaultFocus = () => {
    focusHeading.textContent = "The 2161 alignment";
    focusSubheading.innerHTML = `Approximate heliocentric positions for <strong>${options.dateLabel}</strong>, when all eight planets gather on one side of the Sun.`;
    categoryLabel.textContent = defaultInfoCopy.category.label;
    categoryValue.textContent = defaultInfoCopy.category.value;
    distanceLabel.textContent = defaultInfoCopy.distance.label;
    distanceValue.textContent = defaultInfoCopy.distance.value;
    radiusLabel.textContent = defaultInfoCopy.radius.label;
    radiusValue.textContent = defaultInfoCopy.radius.value;
    periodLabel.textContent = defaultInfoCopy.period.label;
    periodValue.textContent = defaultInfoCopy.period.value;
    anomalyLabel.textContent = defaultInfoCopy.anomaly.label;
    anomalyValue.textContent = defaultInfoCopy.anomaly.value;
    noteLabel.textContent = defaultInfoCopy.note.label;
    noteValue.textContent = defaultInfoCopy.note.value;
    resetFocusAccent();
    document.body.dataset.selectedPlanet = "";
  };

  const applyPlanetFocusLabels = () => {
    categoryLabel.textContent = PLANET_INFO_LABELS.category;
    distanceLabel.textContent = PLANET_INFO_LABELS.distance;
    radiusLabel.textContent = PLANET_INFO_LABELS.radius;
    periodLabel.textContent = PLANET_INFO_LABELS.period;
    anomalyLabel.textContent = PLANET_INFO_LABELS.anomaly;
    noteLabel.textContent = PLANET_INFO_LABELS.note;
  };

  applyDefaultFocus();

  return {
    updateFocus(snapshot, source) {
      if (!snapshot) {
        applyDefaultFocus();
        return;
      }

      applyPlanetFocusLabels();
      focusHeading.textContent = snapshot.definition.label;
      focusSubheading.textContent = source === "selected"
        ? "Pinned from your current selection."
        : "Live preview from the current hover target.";
      categoryValue.textContent = snapshot.definition.category;
      distanceValue.textContent = `${formatDistanceAu(snapshot.heliocentricDistanceAu)} (${formatDistanceMillionKm(snapshot.heliocentricDistanceAu)})`;
      radiusValue.textContent = `${snapshot.definition.radiusKm.toLocaleString()} km`;
      periodValue.textContent = `${snapshot.orbitalPeriodYears.toFixed(1)} years`;
      anomalyValue.textContent = `${snapshot.meanAnomalyDeg.toFixed(1)}°`;
      noteValue.textContent = snapshot.definition.note ?? "Position derived from the JPL approximation model.";
      focusAccent.hidden = source !== "selected";
      focusAccent.style.backgroundColor = snapshot.definition.visual.accentColor;
      infoPanel.dataset.focusSource = source;
      infoPanel.style.borderColor = source === "selected" ? snapshot.definition.visual.accentColor : "";
      document.body.dataset.selectedPlanet = source === "selected" ? snapshot.definition.id : "";
    },
  };
}
