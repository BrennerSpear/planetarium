import { Camera, Vector3 } from "three";

export interface OverlayPlanetLabel {
  id: string;
  label: string;
  position: Vector3;
}

export interface OverlayLayer {
  bindPlanetSelection(handler: (planetId: string) => void): void;
  syncPlanetLabels(
    labels: OverlayPlanetLabel[],
    camera: Camera,
    viewport: { width: number; height: number },
    state: { hoveredId: string | null; selectedId: string | null },
  ): void;
}

interface OverlayLayerOptions {
  root: HTMLElement;
}

export function createOverlayLayer(options: OverlayLayerOptions): OverlayLayer {
  const root = options.root;
  root.innerHTML = `
    <div class="planet-label-layer" data-planet-label-layer></div>
  `;

  const planetLabelLayer = root.querySelector<HTMLElement>("[data-planet-label-layer]");

  if (!planetLabelLayer) {
    throw new Error("Overlay layers did not initialize");
  }

  const planetButtons = new Map<string, HTMLButtonElement>();
  let selectionHandler: ((planetId: string) => void) | null = null;

  const ensurePlanetButton = (label: OverlayPlanetLabel): HTMLButtonElement => {
    const existing = planetButtons.get(label.id);

    if (existing) {
      existing.textContent = label.label;
      return existing;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "planet-label";
    button.dataset.planetLabel = label.id;
    button.addEventListener("click", () => {
      selectionHandler?.(label.id);
    });
    planetLabelLayer.append(button);
    planetButtons.set(label.id, button);
    button.textContent = label.label;
    return button;
  };

  return {
    bindPlanetSelection(handler) {
      selectionHandler = handler;
    },
    syncPlanetLabels(labels, camera, viewport, state) {
      const seen = new Set<string>();
      const rankById = new Map(
        [...labels]
          .sort((left, right) => left.position.length() - right.position.length())
          .map((label, index) => [label.id, index]),
      );

      for (const label of labels) {
        seen.add(label.id);
        const button = ensurePlanetButton(label);
        const isSelected = state.selectedId === label.id;
        const isHovered = state.hoveredId === label.id;
        const rank = rankById.get(label.id) ?? 0;

        button.dataset.selected = String(isSelected);
        button.dataset.hovered = String(isHovered);
        button.style.zIndex = String(isSelected || isHovered ? 2_000 : Math.max(1, 1_000 - rank));
        projectNode(button, label.position, camera, viewport, { yOffset: -12 - rank * 18 });
      }

      for (const [id, button] of planetButtons) {
        if (!seen.has(id)) {
          button.remove();
          planetButtons.delete(id);
        }
      }
    },
  };
}

function projectNode(
  node: HTMLElement,
  worldPosition: Vector3,
  camera: Camera,
  viewport: { width: number; height: number },
  options: { yOffset: number },
): void {
  const projected = projectPoint(worldPosition, camera, viewport);
  node.hidden = !projected.visible;

  if (!node.hidden) {
    node.style.transform = `translate(${projected.x}px, ${projected.y + options.yOffset}px) translate(-50%, -50%)`;
  }
}

function projectPoint(
  worldPosition: Vector3,
  camera: Camera,
  viewport: { width: number; height: number },
): { x: number; y: number; visible: boolean } {
  const projected = worldPosition.clone().project(camera);
  const isVisible = projected.z > -1 && projected.z < 1;
  const x = (projected.x * 0.5 + 0.5) * viewport.width;
  const y = (-projected.y * 0.5 + 0.5) * viewport.height;
  const insideViewport = x >= -80 && x <= viewport.width + 80 && y >= -80 && y <= viewport.height + 80;

  return {
    x,
    y,
    visible: isVisible && insideViewport,
  };
}
