import { Vector3 } from "three";

export type ScaleMode = "visible" | "true";

type PlanetKind = "rocky" | "gas" | "ice" | "earth" | "sun";

interface VisualProfile {
  kind: PlanetKind;
  palette: readonly string[];
  accentColor: string;
  bandCount?: number;
  spotColor?: string;
  cloudColor?: string;
  polarColor?: string;
}

interface JplOrbitalModel {
  type: "jpl";
  a0: number;
  aDot: number;
  e0: number;
  eDot: number;
  i0: number;
  iDot: number;
  l0: number;
  lDot: number;
  longPeri0: number;
  longPeriDot: number;
  longNode0: number;
  longNodeDot: number;
  anomalyCorrection?: {
    b: number;
    c: number;
    s: number;
    f: number;
  };
}

interface OsculatingOrbitalModel {
  type: "osculating";
  epochJulianDate: number;
  semiMajorAxisAu: number;
  eccentricity: number;
  inclinationDeg: number;
  longitudeOfAscendingNodeDeg: number;
  argumentOfPerihelionDeg: number;
  meanAnomalyDeg: number;
  meanMotionDegPerDay: number;
}

type OrbitalModel = JplOrbitalModel | OsculatingOrbitalModel;

export interface PlanetDefinition {
  id: string;
  label: string;
  category: string;
  radiusKm: number;
  orbit: OrbitalModel;
  visual: VisualProfile;
  note?: string;
}

export interface PlanetSnapshot {
  definition: PlanetDefinition;
  position: Vector3;
  heliocentricDistanceAu: number;
  trueRadiusAu: number;
  visibleRadiusAu: number;
  orbitalPeriodYears: number;
  meanAnomalyDeg: number;
}

interface ResolvedOrbitalParameters {
  semiMajorAxisAu: number;
  eccentricity: number;
  inclinationDeg: number;
  longitudeOfAscendingNodeDeg: number;
  argumentOfPerihelionDeg: number;
  meanAnomalyDeg: number;
}

const AU_IN_KM = 149_597_870.7;
const J2000_JULIAN_DATE = 2_451_545.0;
const MERCURY_RADIUS_KM = 2_439.7;
const VISIBLE_INNER_ORBIT_LIMIT_AU = 2.25;
const VISIBLE_INNER_ORBIT_EXPANDED_LIMIT_AU = 4.5;

export const TARGET_DATE_LABEL = "May 19, 2161";

// Exact Gregorian-to-Julian conversion for 2161-05-19 00:00 UTC.
export const TARGET_JULIAN_DATE = gregorianDateToJulianDate(2161, 5, 19);

export const SUN_DEFINITION: PlanetDefinition = {
  id: "sun",
  label: "Sun",
  category: "Star",
  radiusKm: 696_340,
  orbit: {
    type: "osculating",
    epochJulianDate: J2000_JULIAN_DATE,
    semiMajorAxisAu: 0,
    eccentricity: 0,
    inclinationDeg: 0,
    longitudeOfAscendingNodeDeg: 0,
    argumentOfPerihelionDeg: 0,
    meanAnomalyDeg: 0,
    meanMotionDegPerDay: 0,
  },
  visual: {
    kind: "sun",
    palette: ["#ffb347", "#ffd36b", "#fff1b2"],
    accentColor: "#ffd36b",
  },
  note: "Point-light source placed at the origin.",
};

export const PLANET_DEFINITIONS: readonly PlanetDefinition[] = [
  {
    id: "mercury",
    label: "Mercury",
    category: "Rocky",
    radiusKm: 2_439.7,
    orbit: {
      type: "jpl",
      a0: 0.38709843,
      aDot: 0,
      e0: 0.20563661,
      eDot: 0.00002123,
      i0: 7.00559432,
      iDot: -0.00590158,
      l0: 252.25166724,
      lDot: 149_472.67486623,
      longPeri0: 77.45771895,
      longPeriDot: 0.15940013,
      longNode0: 48.33961819,
      longNodeDot: -0.12214182,
    },
    visual: {
      kind: "rocky",
      palette: ["#4f4740", "#76695d", "#a6927d", "#d1c4b1"],
      accentColor: "#d6c1ab",
      spotColor: "#2f2924",
    },
  },
  {
    id: "venus",
    label: "Venus",
    category: "Rocky",
    radiusKm: 6_051.8,
    orbit: {
      type: "jpl",
      a0: 0.72332102,
      aDot: -0.00000026,
      e0: 0.00676399,
      eDot: -0.00005107,
      i0: 3.39777545,
      iDot: 0.00043494,
      l0: 181.9797085,
      lDot: 58_517.8156026,
      longPeri0: 131.76755713,
      longPeriDot: 0.05679648,
      longNode0: 76.67261496,
      longNodeDot: -0.27274174,
    },
    visual: {
      kind: "rocky",
      palette: ["#775e35", "#9e7d45", "#d5b468", "#f2dd99"],
      accentColor: "#f3d998",
      cloudColor: "#f6e3b7",
    },
  },
  {
    id: "earth",
    label: "Earth",
    category: "Terrestrial",
    radiusKm: 6_371,
    orbit: {
      type: "jpl",
      a0: 1.00000018,
      aDot: -0.00000003,
      e0: 0.01673163,
      eDot: -0.00003661,
      i0: -0.00054346,
      iDot: -0.01337178,
      l0: 100.46691572,
      lDot: 35_999.37306329,
      longPeri0: 102.93005885,
      longPeriDot: 0.3179526,
      longNode0: -5.11260389,
      longNodeDot: -0.24123856,
    },
    visual: {
      kind: "earth",
      palette: ["#0f4c7f", "#247b8d", "#45965b", "#7c9858", "#e7f3ff"],
      accentColor: "#9ed4ff",
      cloudColor: "#edf7ff",
      polarColor: "#f9fdff",
    },
    note: "Orbit uses the Earth-Moon barycenter elements from the JPL approximation table.",
  },
  {
    id: "mars",
    label: "Mars",
    category: "Rocky",
    radiusKm: 3_389.5,
    orbit: {
      type: "jpl",
      a0: 1.52371243,
      aDot: 0.00000097,
      e0: 0.09336511,
      eDot: 0.00009149,
      i0: 1.85181869,
      iDot: -0.00724757,
      l0: -4.56813164,
      lDot: 19_140.29934243,
      longPeri0: -23.91744784,
      longPeriDot: 0.45223625,
      longNode0: 49.71320984,
      longNodeDot: -0.26852431,
    },
    visual: {
      kind: "rocky",
      palette: ["#5d291d", "#8f4428", "#c66f41", "#dba06b"],
      accentColor: "#e0945f",
      polarColor: "#f1dcc7",
    },
  },
  {
    id: "jupiter",
    label: "Jupiter",
    category: "Gas giant",
    radiusKm: 69_911,
    orbit: {
      type: "jpl",
      a0: 5.20248019,
      aDot: -0.00002864,
      e0: 0.0485359,
      eDot: 0.00018026,
      i0: 1.29861416,
      iDot: -0.00322699,
      l0: 34.33479152,
      lDot: 3_034.90371757,
      longPeri0: 14.27495244,
      longPeriDot: 0.18199196,
      longNode0: 100.29282654,
      longNodeDot: 0.13024619,
      anomalyCorrection: {
        b: -0.00012452,
        c: 0.0606406,
        s: -0.35635438,
        f: 38.35125,
      },
    },
    visual: {
      kind: "gas",
      palette: ["#7c5535", "#b88658", "#e1bb8c", "#f3d7a9"],
      accentColor: "#f3d29c",
      bandCount: 13,
      spotColor: "#cc6f4b",
    },
  },
  {
    id: "saturn",
    label: "Saturn",
    category: "Gas giant",
    radiusKm: 58_232,
    orbit: {
      type: "jpl",
      a0: 9.54149883,
      aDot: -0.00003065,
      e0: 0.05550825,
      eDot: -0.00032044,
      i0: 2.49424102,
      iDot: 0.00451969,
      l0: 50.07571329,
      lDot: 1_222.11494724,
      longPeri0: 92.86136063,
      longPeriDot: 0.54179478,
      longNode0: 113.63998702,
      longNodeDot: -0.25015002,
      anomalyCorrection: {
        b: 0.00025899,
        c: -0.13434469,
        s: 0.87320147,
        f: 38.35125,
      },
    },
    visual: {
      kind: "gas",
      palette: ["#76634f", "#b59b76", "#d7c099", "#f1dfb3"],
      accentColor: "#ead6ab",
      bandCount: 15,
      spotColor: "#cfb68f",
    },
  },
  {
    id: "uranus",
    label: "Uranus",
    category: "Ice giant",
    radiusKm: 25_362,
    orbit: {
      type: "jpl",
      a0: 19.18797948,
      aDot: -0.00020455,
      e0: 0.0468574,
      eDot: -0.0000155,
      i0: 0.77298127,
      iDot: -0.00180155,
      l0: 314.20276625,
      lDot: 428.49512595,
      longPeri0: 172.43404441,
      longPeriDot: 0.09266985,
      longNode0: 73.96250215,
      longNodeDot: 0.05739699,
      anomalyCorrection: {
        b: 0.00058331,
        c: -0.97731848,
        s: 0.17689245,
        f: 7.67025,
      },
    },
    visual: {
      kind: "ice",
      palette: ["#4b6d79", "#6fa3b2", "#9fd5dc", "#dff8f6"],
      accentColor: "#b5edf0",
      bandCount: 7,
    },
  },
  {
    id: "neptune",
    label: "Neptune",
    category: "Ice giant",
    radiusKm: 24_622,
    orbit: {
      type: "jpl",
      a0: 30.06952752,
      aDot: 0.00006447,
      e0: 0.00895439,
      eDot: 0.00000818,
      i0: 1.7700552,
      iDot: 0.000224,
      l0: 304.22289287,
      lDot: 218.46515314,
      longPeri0: 46.68158724,
      longPeriDot: 0.01009938,
      longNode0: 131.78635853,
      longNodeDot: -0.00606302,
      anomalyCorrection: {
        b: -0.00041348,
        c: 0.68346318,
        s: -0.10162547,
        f: 7.67025,
      },
    },
    visual: {
      kind: "ice",
      palette: ["#20386c", "#2a57a0", "#4e82df", "#7ba8f5"],
      accentColor: "#7da8ff",
      bandCount: 9,
      spotColor: "#244a93",
    },
  },
] as const;

export function getPlanetSnapshots(julianDate: number): PlanetSnapshot[] {
  return PLANET_DEFINITIONS.map((definition) => {
    const position = computePosition(definition.orbit, julianDate);
    const heliocentricDistanceAu = position.length();
    const trueRadiusAu = definition.radiusKm / AU_IN_KM;
    const visibleRadiusAu = computeVisibleRadiusAu(definition.id, definition.radiusKm);
    const orbitalPeriodYears = definition.orbit.type === "osculating"
      ? ((360 / definition.orbit.meanMotionDegPerDay) / 365.25)
      : Math.sqrt(definition.orbit.a0 ** 3);

    return {
      definition,
      position,
      heliocentricDistanceAu,
      trueRadiusAu,
      visibleRadiusAu,
      orbitalPeriodYears,
      meanAnomalyDeg: computeMeanAnomaly(definition.orbit, julianDate),
    };
  });
}

export function getSunRadii(): { trueRadiusAu: number; visibleRadiusAu: number } {
  return {
    trueRadiusAu: SUN_DEFINITION.radiusKm / AU_IN_KM,
    visibleRadiusAu: 0.52,
  };
}

export function getOrbitPathPoints(
  definition: PlanetDefinition,
  julianDate: number,
  segmentCount = 192,
): Vector3[] {
  const parameters = resolveOrbitalParameters(definition.orbit, julianDate);

  if (parameters.semiMajorAxisAu === 0 || segmentCount < 3) {
    return [new Vector3(0, 0, 0)];
  }

  const semiMinorAxisAu = parameters.semiMajorAxisAu * Math.sqrt(1 - parameters.eccentricity ** 2);
  const points: Vector3[] = [];

  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
    const eccentricAnomaly = (segmentIndex / segmentCount) * Math.PI * 2;
    const xPrime = parameters.semiMajorAxisAu * (Math.cos(eccentricAnomaly) - parameters.eccentricity);
    const yPrime = semiMinorAxisAu * Math.sin(eccentricAnomaly);
    points.push(orbitalPlanePointToEcliptic(xPrime, yPrime, parameters));
  }

  return points;
}

export function getDisplayPosition(position: Vector3, scaleMode: ScaleMode): Vector3 {
  if (scaleMode === "true") {
    return position.clone();
  }

  const distanceAu = position.length();

  if (distanceAu <= 0) {
    return position.clone();
  }

  return position.clone().multiplyScalar(mapVisibleDistance(distanceAu) / distanceAu);
}

export function formatDistanceAu(distanceAu: number): string {
  return distanceAu >= 10
    ? `${distanceAu.toFixed(1)} AU`
    : `${distanceAu.toFixed(2)} AU`;
}

export function formatDistanceMillionKm(distanceAu: number): string {
  return `${(distanceAu * 149.5978707).toFixed(1)} million km`;
}

export function gregorianDateToJulianDate(year: number, month: number, day: number): number {
  let adjustedYear = year;
  let adjustedMonth = month;

  if (adjustedMonth <= 2) {
    adjustedYear -= 1;
    adjustedMonth += 12;
  }

  const century = Math.floor(adjustedYear / 100);
  const correction = 2 - century + Math.floor(century / 4);

  return Math.floor(365.25 * (adjustedYear + 4716))
    + Math.floor(30.6001 * (adjustedMonth + 1))
    + day
    + correction
    - 1524.5;
}

function computeVisibleRadiusAu(id: string, radiusKm: number): number {
  if (id === "sun") {
    return 0.52;
  }

  const ratio = radiusKm / MERCURY_RADIUS_KM;
  return 0.032 * Math.pow(ratio, 0.52);
}

function computePosition(orbit: OrbitalModel, julianDate: number): Vector3 {
  return orbitalPlaneToEcliptic(resolveOrbitalParameters(orbit, julianDate));
}

function computeMeanAnomaly(orbit: OrbitalModel, julianDate: number): number {
  if (orbit.type === "osculating") {
    return normalizeDegreesSigned(
      orbit.meanAnomalyDeg + orbit.meanMotionDegPerDay * (julianDate - orbit.epochJulianDate),
    );
  }

  const centuries = (julianDate - J2000_JULIAN_DATE) / 36_525;
  let anomaly = orbit.l0 + orbit.lDot * centuries - (orbit.longPeri0 + orbit.longPeriDot * centuries);

  if (orbit.anomalyCorrection) {
    const angle = orbit.anomalyCorrection.f * centuries;
    anomaly += orbit.anomalyCorrection.b * centuries ** 2;
    anomaly += orbit.anomalyCorrection.c * Math.cos(degreesToRadians(angle));
    anomaly += orbit.anomalyCorrection.s * Math.sin(degreesToRadians(angle));
  }

  return normalizeDegreesSigned(anomaly);
}

function orbitalPlaneToEcliptic(args: {
  semiMajorAxisAu: number;
  eccentricity: number;
  inclinationDeg: number;
  longitudeOfAscendingNodeDeg: number;
  argumentOfPerihelionDeg: number;
  meanAnomalyDeg: number;
}): Vector3 {
  const eccentricAnomaly = solveEccentricAnomaly(args.meanAnomalyDeg, args.eccentricity);
  const xPrime = args.semiMajorAxisAu * (Math.cos(eccentricAnomaly) - args.eccentricity);
  const yPrime = args.semiMajorAxisAu
    * Math.sqrt(1 - args.eccentricity ** 2)
    * Math.sin(eccentricAnomaly);

  return orbitalPlanePointToEcliptic(xPrime, yPrime, args);
}

function orbitalPlanePointToEcliptic(
  xPrime: number,
  yPrime: number,
  args: {
    inclinationDeg: number;
    longitudeOfAscendingNodeDeg: number;
    argumentOfPerihelionDeg: number;
  },
): Vector3 {

  const omega = degreesToRadians(args.argumentOfPerihelionDeg);
  const longNode = degreesToRadians(args.longitudeOfAscendingNodeDeg);
  const inclination = degreesToRadians(args.inclinationDeg);

  const cosOmega = Math.cos(omega);
  const sinOmega = Math.sin(omega);
  const cosNode = Math.cos(longNode);
  const sinNode = Math.sin(longNode);
  const cosInclination = Math.cos(inclination);
  const sinInclination = Math.sin(inclination);

  const xEcliptic = (cosOmega * cosNode - sinOmega * sinNode * cosInclination) * xPrime
    + (-sinOmega * cosNode - cosOmega * sinNode * cosInclination) * yPrime;
  const yEcliptic = (cosOmega * sinNode + sinOmega * cosNode * cosInclination) * xPrime
    + (-sinOmega * sinNode + cosOmega * cosNode * cosInclination) * yPrime;
  const zEcliptic = (sinOmega * sinInclination) * xPrime
    + (cosOmega * sinInclination) * yPrime;

  return new Vector3(xEcliptic, zEcliptic, yEcliptic);
}

function resolveOrbitalParameters(orbit: OrbitalModel, julianDate: number): ResolvedOrbitalParameters {
  if (orbit.type === "osculating") {
    return {
      semiMajorAxisAu: orbit.semiMajorAxisAu,
      eccentricity: orbit.eccentricity,
      inclinationDeg: orbit.inclinationDeg,
      longitudeOfAscendingNodeDeg: orbit.longitudeOfAscendingNodeDeg,
      argumentOfPerihelionDeg: orbit.argumentOfPerihelionDeg,
      meanAnomalyDeg: computeMeanAnomaly(orbit, julianDate),
    };
  }

  const centuries = (julianDate - J2000_JULIAN_DATE) / 36_525;
  const longitudeOfAscendingNodeDeg = orbit.longNode0 + orbit.longNodeDot * centuries;
  const longitudeOfPerihelionDeg = orbit.longPeri0 + orbit.longPeriDot * centuries;

  return {
    semiMajorAxisAu: orbit.a0 + orbit.aDot * centuries,
    eccentricity: orbit.e0 + orbit.eDot * centuries,
    inclinationDeg: orbit.i0 + orbit.iDot * centuries,
    longitudeOfAscendingNodeDeg,
    argumentOfPerihelionDeg: longitudeOfPerihelionDeg - longitudeOfAscendingNodeDeg,
    meanAnomalyDeg: normalizeDegreesSigned(computeMeanAnomaly(orbit, julianDate)),
  };
}

function mapVisibleDistance(distanceAu: number): number {
  if (distanceAu <= VISIBLE_INNER_ORBIT_LIMIT_AU) {
    return VISIBLE_INNER_ORBIT_EXPANDED_LIMIT_AU
      * Math.sqrt(distanceAu / VISIBLE_INNER_ORBIT_LIMIT_AU);
  }

  return VISIBLE_INNER_ORBIT_EXPANDED_LIMIT_AU + (distanceAu - VISIBLE_INNER_ORBIT_LIMIT_AU);
}

function solveEccentricAnomaly(meanAnomalyDeg: number, eccentricity: number): number {
  const meanAnomaly = degreesToRadians(meanAnomalyDeg);
  let eccentricAnomaly = meanAnomaly;

  for (let iteration = 0; iteration < 12; iteration += 1) {
    const numerator = eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly;
    const denominator = 1 - eccentricity * Math.cos(eccentricAnomaly);
    const delta = numerator / denominator;

    eccentricAnomaly -= delta;

    if (Math.abs(delta) < 1e-7) {
      break;
    }
  }

  return eccentricAnomaly;
}

function normalizeDegreesSigned(value: number): number {
  let normalized = value % 360;

  if (normalized > 180) {
    normalized -= 360;
  }

  if (normalized < -180) {
    normalized += 360;
  }

  return normalized;
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}
