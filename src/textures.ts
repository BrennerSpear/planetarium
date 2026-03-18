import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  SRGBColorSpace,
} from "three";

import type { PlanetDefinition } from "./planets";
import { createMulberry32 } from "./random";

const textureCache = new Map<string, CanvasTexture>();

type RGB = [number, number, number];

export function createPlanetTexture(definition: PlanetDefinition): CanvasTexture {
  const cached = textureCache.get(definition.id);

  if (cached) {
    return cached;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error(`Unable to build texture for ${definition.label}`);
  }

  const imageData = context.createImageData(canvas.width, canvas.height);
  const palette = definition.visual.palette.map(hexToRgb);
  const seed = hashString(definition.id);

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const u = x / canvas.width;
      const v = y / canvas.height;
      const color = samplePlanetColor(definition, palette, u, v, seed);
      const index = (y * canvas.width + x) * 4;

      imageData.data[index] = color[0];
      imageData.data[index + 1] = color[1];
      imageData.data[index + 2] = color[2];
      imageData.data[index + 3] = 255;
    }
  }

  context.putImageData(imageData, 0, 0);
  overlaySurfaceDetails(context, definition, seed);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;

  textureCache.set(definition.id, texture);
  return texture;
}

function samplePlanetColor(
  definition: PlanetDefinition,
  palette: RGB[],
  u: number,
  v: number,
  seed: number,
): RGB {
  const firstColor = palette[0] ?? [255, 255, 255];
  const secondColor = palette[1] ?? firstColor;
  const thirdColor = palette[2] ?? secondColor;
  const fourthColor = palette[3] ?? thirdColor;
  const lastColor = palette[palette.length - 1] ?? fourthColor;
  const latitude = v * 2 - 1;
  const stormWeight = smoothstep(0.4, 0.9, fbm(u * 6, v * 6, seed + 17));

  switch (definition.visual.kind) {
    case "sun": {
      const radial = 1 - Math.abs(latitude) * 0.72;
      const turbulent = 0.35 * fbm(u * 9, v * 8, seed + 3);
      return mixPalette(palette, clamp01(radial * 0.72 + turbulent));
    }
    case "gas": {
      const bandCount = definition.visual.bandCount ?? 12;
      const bands = v * bandCount + fbm(u * 4, v * 12, seed + 5) * 2.1;
      const stripes = (Math.sin(bands * Math.PI * 2) + 1) * 0.5;
      const detail = fbm(u * 10, v * 24, seed + 11);
      return mixPalette(palette, clamp01(stripes * 0.68 + detail * 0.32 + stormWeight * 0.08));
    }
    case "ice": {
      const bands = (definition.visual.bandCount ?? 8) * v + fbm(u * 4, v * 8, seed + 13) * 0.5;
      const value = clamp01((Math.sin(bands * Math.PI * 2) + 1) * 0.18 + fbm(u * 5, v * 5, seed + 2) * 0.82);
      const polarWeight = 1 - smoothstep(0.42, 0.9, Math.abs(latitude));
      const base = mixPalette(palette, value);
      const polarColor = definition.visual.polarColor ? hexToRgb(definition.visual.polarColor) : lastColor;
      return mixRgb(base, polarColor, polarWeight * 0.55);
    }
    case "earth": {
      const continents = fbm(u * 3.4, v * 4.8, seed + 19) - Math.abs(latitude) * 0.12;
      const ocean = firstColor;
      const deepOcean = secondColor;
      const land = mixRgb(thirdColor, fourthColor, fbm(u * 8, v * 8, seed + 7));
      const base = continents > 0.54 ? land : mixRgb(ocean, deepOcean, fbm(u * 7, v * 7, seed + 23));
      const cloudColor = definition.visual.cloudColor ? hexToRgb(definition.visual.cloudColor) : lastColor;
      const cloudCover = smoothstep(0.72, 0.9, fbm(u * 11, v * 11, seed + 101));
      const polarColor = definition.visual.polarColor ? hexToRgb(definition.visual.polarColor) : cloudColor;
      const polarWeight = 1 - smoothstep(0.58, 0.92, Math.abs(latitude));
      const withClouds = mixRgb(base, cloudColor, cloudCover * 0.4);
      return mixRgb(withClouds, polarColor, polarWeight * 0.7);
    }
    case "rocky":
    default: {
      const terrain = fbm(u * 6, v * 6, seed + 29);
      const rough = fbm(u * 18, v * 18, seed + 43);
      const value = clamp01(terrain * 0.7 + rough * 0.3);
      const base = mixPalette(palette, value);
      const polarColor = definition.visual.polarColor ? hexToRgb(definition.visual.polarColor) : base;
      const polarWeight = definition.id === "mars" ? 1 - smoothstep(0.72, 0.94, Math.abs(latitude)) : 0;
      return mixRgb(base, polarColor, polarWeight * 0.85);
    }
  }
}

function overlaySurfaceDetails(
  context: CanvasRenderingContext2D,
  definition: PlanetDefinition,
  seed: number,
): void {
  const rng = createMulberry32(seed);

  if (definition.visual.kind === "gas") {
    const spotColor = definition.visual.spotColor ?? "#cc7a4a";
    context.fillStyle = `${spotColor}cc`;

    const stormCount = definition.id === "jupiter" ? 2 : definition.id === "neptune" ? 1 : 0;

    for (let stormIndex = 0; stormIndex < stormCount; stormIndex += 1) {
      const x = definition.id === "jupiter" && stormIndex === 0
        ? context.canvas.width * 0.68
        : context.canvas.width * (0.2 + rng() * 0.6);
      const y = context.canvas.height * (0.25 + rng() * 0.5);
      const width = context.canvas.width * (definition.id === "jupiter" && stormIndex === 0 ? 0.08 : 0.04);
      const height = width * 0.55;
      drawEllipse(context, x, y, width, height);
    }
  }

  if (definition.visual.kind === "rocky") {
    context.lineWidth = 1;
    context.strokeStyle = "rgba(0, 0, 0, 0.12)";
    context.fillStyle = `${definition.visual.spotColor ?? "#2d2520"}55`;

    const craterCount = definition.id === "venus" ? 18 : 34;

    for (let craterIndex = 0; craterIndex < craterCount; craterIndex += 1) {
      const x = rng() * context.canvas.width;
      const y = rng() * context.canvas.height;
      const radius = 4 + rng() * 18;

      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
  }

  if (definition.visual.kind === "earth" && definition.visual.cloudColor) {
    context.globalAlpha = 0.12;
    context.fillStyle = definition.visual.cloudColor;

    for (let cloudIndex = 0; cloudIndex < 28; cloudIndex += 1) {
      const x = rng() * context.canvas.width;
      const y = rng() * context.canvas.height;
      const width = 18 + rng() * 48;
      const height = width * (0.35 + rng() * 0.25);
      drawEllipse(context, x, y, width, height);
    }

    context.globalAlpha = 1;
  }
}

function fbm(x: number, y: number, seed: number): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;

  for (let octave = 0; octave < 4; octave += 1) {
    value += amplitude * valueNoise(x * frequency, y * frequency, seed + octave * 11.3);
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value;
}

function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const sx = smooth01(x - x0);
  const sy = smooth01(y - y0);
  const n00 = random2d(x0, y0, seed);
  const n10 = random2d(x1, y0, seed);
  const n01 = random2d(x0, y1, seed);
  const n11 = random2d(x1, y1, seed);

  const nx0 = lerp(n00, n10, sx);
  const nx1 = lerp(n01, n11, sx);
  return lerp(nx0, nx1, sy);
}

function random2d(x: number, y: number, seed: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 0.12345) * 43_758.5453123;
  return value - Math.floor(value);
}

function smooth01(value: number): number {
  return value * value * (3 - 2 * value);
}

function drawEllipse(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  context.beginPath();
  context.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
  context.fill();
}

function mixPalette(palette: RGB[], value: number): RGB {
  const clampedValue = clamp01(value);
  const scaled = clampedValue * (palette.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(index + 1, palette.length - 1);
  const mix = scaled - index;
  return mixRgb(palette[index] ?? palette[0] ?? [255, 255, 255], palette[nextIndex] ?? palette[index] ?? [255, 255, 255], mix);
}

function mixRgb(a: RGB, b: RGB, amount: number): RGB {
  return [
    Math.round(lerp(a[0], b[0], amount)),
    Math.round(lerp(a[1], b[1], amount)),
    Math.round(lerp(a[2], b[2], amount)),
  ];
}

function hexToRgb(hex: string): RGB {
  const normalized = hex.replace("#", "");
  const expanded = normalized.length === 3
    ? normalized.split("").map((segment) => `${segment}${segment}`).join("")
    : normalized;

  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
}

function lerp(a: number, b: number, amount: number): number {
  return a + (b - a) * amount;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function hashString(value: string): number {
  let hash = 2_169_136_261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}
