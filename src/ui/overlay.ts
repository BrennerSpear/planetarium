import { Camera, Vector3 } from "three";

export interface OverlayPlanetLabel {
  id: string;
  label: string;
  position: Vector3;
}

export interface OverlayDistanceLabel {
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
  syncDistanceLabels(
    labels: OverlayDistanceLabel[],
    camera: Camera,
    viewport: { width: number; height: number },
  ): void;
}

interface OverlayLayerOptions {
  root: HTMLElement;
}

export function createOverlayLayer(options: OverlayLayerOptions): OverlayLayer {
  const root = options.root;
  root.innerHTML = `
    <div class="planet-label-layer" data-planet-label-layer></div>
    <div class="distance-label-layer" data-distance-label-layer></div>
  `;

  const planetLabelLayer = root.querySelector<HTMLElement>("[data-planet-label-layer]");
  const distanceLabelLayer = root.querySelector<HTMLElement>("[data-distance-label-layer]");

  if (!planetLabelLayer || !distanceLabelLayer) {
    throw new Error("Overlay layers did not initialize");
  }

  const planetButtons = new Map<string, HTMLButtonElement>();
  const distanceNodes = new Map<string, HTMLDivElement>();
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

  const ensureDistanceNode = (label: OverlayDistanceLabel): HTMLDivElement => {
    const existing = distanceNodes.get(label.id);

    if (existing) {
      existing.textContent = label.label;
      return existing;
    }

    const node = document.createElement("div");
    node.className = "distance-label";
    node.dataset.distanceLabel = label.id;
    node.textContent = label.label;
    distanceLabelLayer.append(node);
    distanceNodes.set(label.id, node);
    return node;
  };

  return {
    bindPlanetSelection(handler) {
      selectionHandler = handler;
    },
    syncPlanetLabels(labels, camera, viewport, state) {
      const seen = new Set<string>();

      for (const label of labels) {
        seen.add(label.id);
        const button = ensurePlanetButton(label);
        const isSelected = state.selectedId === label.id;
        const isHovered = state.hoveredId === label.id;

        button.dataset.selected = String(isSelected);
        button.dataset.hovered = String(isHovered);
        projectNode(button, label.position, camera, viewport, { yOffset: -10 });
      }

      for (const [id, button] of planetButtons) {
        if (!seen.has(id)) {
          button.remove();
          planetButtons.delete(id);
        }
      }
    },
    syncDistanceLabels(labels, camera, viewport) {
      const seen = new Set<string>();

      for (const label of labels) {
        seen.add(label.id);
        const node = ensureDistanceNode(label);
        projectNode(node, label.position, camera, viewport, { yOffset: 0 });
      }

      for (const [id, node] of distanceNodes) {
        if (!seen.has(id)) {
          node.remove();
          distanceNodes.delete(id);
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
  const projected = worldPosition.clone().project(camera);
  const isVisible = projected.z > -1 && projected.z < 1;
  const x = (projected.x * 0.5 + 0.5) * viewport.width;
  const y = (-projected.y * 0.5 + 0.5) * viewport.height + options.yOffset;

  const insideViewport = x >= -80 && x <= viewport.width + 80 && y >= -80 && y <= viewport.height + 80;

  node.hidden = !(isVisible && insideViewport);

  if (!node.hidden) {
    node.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  }
}
