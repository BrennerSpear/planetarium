type OverlayController = {
  root: HTMLDivElement;
  setReady: (ready: boolean) => void;
  setCameraSummary: (summary: string) => void;
};

export function createOverlay(): OverlayController {
  const root = document.createElement("div");
  root.className = "hud";
  root.dataset.testid = "overlay";

  const status = document.createElement("div");
  status.className = "hud__status";
  status.dataset.testid = "render-status";
  status.dataset.ready = "false";
  status.textContent = "Booting scene";

  const cameraSummary = document.createElement("strong");
  cameraSummary.dataset.testid = "camera-summary";
  cameraSummary.textContent = "0.00, 4.00, 16.00";

  root.innerHTML = `
    <p class="hud__eyebrow">Planetarium</p>
    <h1 class="hud__title">Three.js Orbit Scaffold</h1>
    <p class="hud__subtitle">
      Bun + Vite + TypeScript scaffold with a deterministic render hook for Playwright.
    </p>
    <div class="hud__chips">
      <span class="hud__chip">Orbit drag</span>
      <span class="hud__chip">Wheel zoom</span>
      <span class="hud__chip">Shift pan</span>
    </div>
    <div class="hud__meta">
      <div>
        <span class="hud__label">Render status</span>
      </div>
      <div>
        <span class="hud__label">Camera position</span>
      </div>
    </div>
  `;

  const metaRows = root.querySelectorAll(".hud__meta > div");
  metaRows[0]?.append(status);
  metaRows[1]?.append(cameraSummary);

  return {
    root,
    setReady(ready) {
      status.dataset.ready = String(ready);
      status.textContent = ready ? "Scene ready" : "Booting scene";
    },
    setCameraSummary(summary) {
      cameraSummary.textContent = summary;
    },
  };
}
