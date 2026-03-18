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

export interface OverlayAlignmentGuide {
  axis: {
    start: Vector3;
    end: Vector3;
  };
  ticks: {
    id: string;
    start: Vector3;
    end: Vector3;
  }[];
}

export interface OverlayLayer {
  bindPlanetSelection(handler: (planetId: string) => void): void;
  syncAlignmentGuide(
    guide: OverlayAlignmentGuide,
    camera: Camera,
    viewport: { width: number; height: number },
  ): void;
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
    <svg class="alignment-guide-layer" data-alignment-guide-layer aria-hidden="true"></svg>
    <div class="planet-label-layer" data-planet-label-layer></div>
    <div class="distance-label-layer" data-distance-label-layer></div>
  `;

  const alignmentGuideLayer = root.querySelector<SVGSVGElement>("[data-alignment-guide-layer]");
  const planetLabelLayer = root.querySelector<HTMLElement>("[data-planet-label-layer]");
  const distanceLabelLayer = root.querySelector<HTMLElement>("[data-distance-label-layer]");

  if (!alignmentGuideLayer || !planetLabelLayer || !distanceLabelLayer) {
    throw new Error("Overlay layers did not initialize");
  }

  const planetButtons = new Map<string, HTMLButtonElement>();
  const distanceNodes = new Map<string, HTMLDivElement>();
  const svgNamespace = "http://www.w3.org/2000/svg";
  const axisLine = document.createElementNS(svgNamespace, "line");
  axisLine.classList.add("alignment-axis");
  alignmentGuideLayer.append(axisLine);
  const tickGroup = document.createElementNS(svgNamespace, "g");
  tickGroup.classList.add("alignment-ticks");
  alignmentGuideLayer.append(tickGroup);
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
    syncAlignmentGuide(guide, camera, viewport) {
      alignmentGuideLayer.setAttribute("viewBox", `0 0 ${viewport.width} ${viewport.height}`);
      alignmentGuideLayer.setAttribute("width", String(viewport.width));
      alignmentGuideLayer.setAttribute("height", String(viewport.height));

      const start = projectPoint(guide.axis.start, camera, viewport);
      const end = projectPoint(guide.axis.end, camera, viewport);
      const axisVisible = start.visible && end.visible;

      axisLine.style.display = axisVisible ? "" : "none";

      if (axisVisible) {
        axisLine.setAttribute("x1", String(start.x));
        axisLine.setAttribute("y1", String(start.y));
        axisLine.setAttribute("x2", String(end.x));
        axisLine.setAttribute("y2", String(end.y));
      }

      tickGroup.replaceChildren(...guide.ticks.flatMap((tick) => {
        const startPoint = projectPoint(tick.start, camera, viewport);
        const endPoint = projectPoint(tick.end, camera, viewport);

        if (!startPoint.visible || !endPoint.visible) {
          return [];
        }

        const line = document.createElementNS(svgNamespace, "line");
        line.dataset.alignmentTick = tick.id;
        line.setAttribute("x1", String(startPoint.x));
        line.setAttribute("y1", String(startPoint.y));
        line.setAttribute("x2", String(endPoint.x));
        line.setAttribute("y2", String(endPoint.y));
        return [line];
      }));
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
