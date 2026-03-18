const AU_IN_KILOMETERS = 149_597_870.7;
const JULIAN_CENTURY_DAYS = 36_525;
const J2000_JULIAN_DATE = 2_451_545.0;
const DEG_TO_RAD = Math.PI / 180;
const TAU = Math.PI * 2;

export const ALIGNMENT_JULIAN_DATE = 2_510_487.5;

export const PLANET_NAMES = [
  "Mercury",
  "Venus",
  "Earth",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
] as const;

export type PlanetName = (typeof PLANET_NAMES)[number];

type OrbitalElements = {
  semiMajorAxis: { base: number; rate: number };
  eccentricity: { base: number; rate: number };
  inclinationDeg: { base: number; rate: number };
  meanLongitudeDeg: { base: number; rate: number };
  longitudeOfPerihelionDeg: { base: number; rate: number };
  longitudeOfAscendingNodeDeg: { base: number; rate: number };
  meanAnomalyTerms?: {
    b: number;
    c: number;
    s: number;
    f: number;
  };
};

type PlanetStyle = {
  color: string;
  accent: string;
  radiusKilometers: number;
  blurb: string;
};

type PlanetDefinition = PlanetStyle & {
  name: PlanetName;
  orbitalElements: OrbitalElements;
};

export type PlanetCoordinate = {
  name: PlanetName;
  x: number;
  y: number;
  z: number;
};

export type PlanetState = PlanetCoordinate &
  PlanetStyle & {
    distanceFromSunAu: number;
    radiusAu: number;
    meanAnomalyDeg: number;
    eccentricAnomalyRad: number;
    eccentricity: number;
    inclinationDeg: number;
    longitudeOfAscendingNodeDeg: number;
    argumentOfPerihelionDeg: number;
    meanLongitudeDeg: number;
  };

const PLANET_DEFINITIONS: PlanetDefinition[] = [
  {
    name: "Mercury",
    color: "#d6b08c",
    accent: "#ffd7b0",
    radiusKilometers: 2439.7,
    blurb: "Swift, sun-scorched, and still tucked closest to the alignment spine.",
    orbitalElements: {
      semiMajorAxis: { base: 0.38709843, rate: 0 },
      eccentricity: { base: 0.20563661, rate: 0.00002123 },
      inclinationDeg: { base: 7.00559432, rate: -0.00590158 },
      meanLongitudeDeg: { base: 252.25166724, rate: 149472.67486623 },
      longitudeOfPerihelionDeg: { base: 77.45771895, rate: 0.15940013 },
      longitudeOfAscendingNodeDeg: { base: 48.33961819, rate: -0.12214182 },
    },
  },
  {
    name: "Venus",
    color: "#f0c798",
    accent: "#ffe5ba",
    radiusKilometers: 6051.8,
    blurb: "The brightest inner-world glow, nearly circular and tightly packed into the cluster.",
    orbitalElements: {
      semiMajorAxis: { base: 0.72332102, rate: -0.00000026 },
      eccentricity: { base: 0.00676399, rate: -0.00005107 },
      inclinationDeg: { base: 3.39777545, rate: 0.00043494 },
      meanLongitudeDeg: { base: 181.9797085, rate: 58517.8156026 },
      longitudeOfPerihelionDeg: { base: 131.76755713, rate: 0.05679648 },
      longitudeOfAscendingNodeDeg: { base: 76.67261496, rate: -0.27274174 },
    },
  },
  {
    name: "Earth",
    color: "#4ca7ff",
    accent: "#9addff",
    radiusKilometers: 6371.0,
    blurb: "Computed from the JPL Earth-Moon barycenter elements, which is the published approximation set.",
    orbitalElements: {
      semiMajorAxis: { base: 1.00000018, rate: -0.00000003 },
      eccentricity: { base: 0.01673163, rate: -0.00003661 },
      inclinationDeg: { base: -0.00054346, rate: -0.01337178 },
      meanLongitudeDeg: { base: 100.46691572, rate: 35999.37306329 },
      longitudeOfPerihelionDeg: { base: 102.93005885, rate: 0.3179526 },
      longitudeOfAscendingNodeDeg: { base: -5.11260389, rate: -0.24123856 },
    },
  },
  {
    name: "Mars",
    color: "#c86b4d",
    accent: "#ffae84",
    radiusKilometers: 3389.5,
    blurb: "A rust-red waypoint sitting just beyond Earth along the alignment chain.",
    orbitalElements: {
      semiMajorAxis: { base: 1.52371243, rate: 0.00000097 },
      eccentricity: { base: 0.09336511, rate: 0.00009149 },
      inclinationDeg: { base: 1.85181869, rate: -0.00724757 },
      meanLongitudeDeg: { base: -4.56813164, rate: 19140.29934243 },
      longitudeOfPerihelionDeg: { base: -23.91744784, rate: 0.45223625 },
      longitudeOfAscendingNodeDeg: { base: 49.71320984, rate: -0.26852431 },
    },
  },
  {
    name: "Jupiter",
    color: "#cfa36f",
    accent: "#ffe1ba",
    radiusKilometers: 69911,
    blurb: "The dominant gas giant anchor on the inner half of the outer-planet sweep.",
    orbitalElements: {
      semiMajorAxis: { base: 5.20248019, rate: -0.00002864 },
      eccentricity: { base: 0.0485359, rate: 0.00018026 },
      inclinationDeg: { base: 1.29861416, rate: -0.00322699 },
      meanLongitudeDeg: { base: 34.33479152, rate: 3034.90371757 },
      longitudeOfPerihelionDeg: { base: 14.27495244, rate: 0.18199196 },
      longitudeOfAscendingNodeDeg: { base: 100.29282654, rate: 0.13024619 },
      meanAnomalyTerms: {
        b: -0.00012452,
        c: 0.0606406,
        s: -0.35635438,
        f: 38.35125,
      },
    },
  },
  {
    name: "Saturn",
    color: "#c6b180",
    accent: "#fff0b8",
    radiusKilometers: 58232,
    blurb: "A wide-banded giant whose ring silhouette helps define the alignment visually.",
    orbitalElements: {
      semiMajorAxis: { base: 9.54149883, rate: -0.00003065 },
      eccentricity: { base: 0.05550825, rate: -0.00032044 },
      inclinationDeg: { base: 2.49424102, rate: 0.00451969 },
      meanLongitudeDeg: { base: 50.07571329, rate: 1222.11494724 },
      longitudeOfPerihelionDeg: { base: 92.86136063, rate: 0.54179478 },
      longitudeOfAscendingNodeDeg: { base: 113.63998702, rate: -0.25015002 },
      meanAnomalyTerms: {
        b: 0.00025899,
        c: -0.13434469,
        s: 0.87320147,
        f: 38.35125,
      },
    },
  },
  {
    name: "Uranus",
    color: "#88d2df",
    accent: "#d8fbff",
    radiusKilometers: 25362,
    blurb: "Icy blue and drifting farther out, but still on the same solar-facing arc.",
    orbitalElements: {
      semiMajorAxis: { base: 19.18797948, rate: -0.00020455 },
      eccentricity: { base: 0.0468574, rate: -0.0000155 },
      inclinationDeg: { base: 0.77298127, rate: -0.00180155 },
      meanLongitudeDeg: { base: 314.20276625, rate: 428.49512595 },
      longitudeOfPerihelionDeg: { base: 172.43404441, rate: 0.09266985 },
      longitudeOfAscendingNodeDeg: { base: 73.96250215, rate: 0.05739699 },
      meanAnomalyTerms: {
        b: 0.00058331,
        c: -0.97731848,
        s: 0.17689245,
        f: 7.67025,
      },
    },
  },
  {
    name: "Neptune",
    color: "#4f7dff",
    accent: "#a8beff",
    radiusKilometers: 24622,
    blurb: "The deep-blue far-field marker, orbiting at roughly 30 AU from the Sun.",
    orbitalElements: {
      semiMajorAxis: { base: 30.06952752, rate: 0.00006447 },
      eccentricity: { base: 0.00895439, rate: 0.00000818 },
      inclinationDeg: { base: 1.7700552, rate: 0.000224 },
      meanLongitudeDeg: { base: 304.22289287, rate: 218.46515314 },
      longitudeOfPerihelionDeg: { base: 46.68158724, rate: 0.01009938 },
      longitudeOfAscendingNodeDeg: { base: 131.78635853, rate: -0.00606302 },
      meanAnomalyTerms: {
        b: -0.00041348,
        c: 0.68346318,
        s: -0.10162547,
        f: 7.67025,
      },
    },
  },
  {
    name: "Pluto",
    color: "#a8947f",
    accent: "#f2e4d3",
    radiusKilometers: 1188.3,
    blurb: "Included using the older JPL nine-planet approximation table so the 2161 lineup remains complete.",
    orbitalElements: {
      semiMajorAxis: { base: 39.48686035, rate: 0.00449751 },
      eccentricity: { base: 0.24885238, rate: 0.00006016 },
      inclinationDeg: { base: 17.1410426, rate: 0.00000501 },
      meanLongitudeDeg: { base: 238.96535011, rate: 145.18042903 },
      longitudeOfPerihelionDeg: { base: 224.09702598, rate: -0.00968827 },
      longitudeOfAscendingNodeDeg: { base: 110.30167986, rate: -0.00809981 },
      meanAnomalyTerms: {
        b: -0.01262724,
        c: 0,
        s: 0,
        f: 0,
      },
    },
  },
];

const normalizeDegrees = (angle: number): number => {
  const normalized = angle % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const normalizeRadians = (angle: number): number => {
  let normalized = angle % TAU;
  if (normalized > Math.PI) {
    normalized -= TAU;
  }
  if (normalized < -Math.PI) {
    normalized += TAU;
  }
  return normalized;
};

const evaluateLinearTerm = (
  term: { base: number; rate: number },
  centuriesSinceJ2000: number,
): number => term.base + term.rate * centuriesSinceJ2000;

export const solveKeplerEquation = (
  meanAnomalyRad: number,
  eccentricity: number,
): number => {
  let eccentricAnomaly =
    meanAnomalyRad + eccentricity * Math.sin(meanAnomalyRad);

  for (let iteration = 0; iteration < 15; iteration += 1) {
    const delta =
      (eccentricAnomaly -
        eccentricity * Math.sin(eccentricAnomaly) -
        meanAnomalyRad) /
      (1 - eccentricity * Math.cos(eccentricAnomaly));
    eccentricAnomaly -= delta;
    if (Math.abs(delta) < 1e-12) {
      break;
    }
  }

  return eccentricAnomaly;
};

export const computePlanetState = (
  definition: PlanetDefinition,
  julianDate = ALIGNMENT_JULIAN_DATE,
): PlanetState => {
  const centuriesSinceJ2000 =
    (julianDate - J2000_JULIAN_DATE) / JULIAN_CENTURY_DAYS;
  const semiMajorAxis = evaluateLinearTerm(
    definition.orbitalElements.semiMajorAxis,
    centuriesSinceJ2000,
  );
  const eccentricity = evaluateLinearTerm(
    definition.orbitalElements.eccentricity,
    centuriesSinceJ2000,
  );
  const inclinationDeg = evaluateLinearTerm(
    definition.orbitalElements.inclinationDeg,
    centuriesSinceJ2000,
  );
  const meanLongitudeDeg = evaluateLinearTerm(
    definition.orbitalElements.meanLongitudeDeg,
    centuriesSinceJ2000,
  );
  const longitudeOfPerihelionDeg = evaluateLinearTerm(
    definition.orbitalElements.longitudeOfPerihelionDeg,
    centuriesSinceJ2000,
  );
  const longitudeOfAscendingNodeDeg = evaluateLinearTerm(
    definition.orbitalElements.longitudeOfAscendingNodeDeg,
    centuriesSinceJ2000,
  );

  let meanAnomalyDeg = meanLongitudeDeg - longitudeOfPerihelionDeg;
  const meanAnomalyTerms = definition.orbitalElements.meanAnomalyTerms;
  if (meanAnomalyTerms) {
    meanAnomalyDeg +=
      meanAnomalyTerms.b * centuriesSinceJ2000 * centuriesSinceJ2000 +
      meanAnomalyTerms.c *
        Math.cos(meanAnomalyTerms.f * centuriesSinceJ2000 * DEG_TO_RAD) +
      meanAnomalyTerms.s *
        Math.sin(meanAnomalyTerms.f * centuriesSinceJ2000 * DEG_TO_RAD);
  }

  meanAnomalyDeg = normalizeDegrees(meanAnomalyDeg);

  const eccentricAnomalyRad = solveKeplerEquation(
    normalizeRadians(meanAnomalyDeg * DEG_TO_RAD),
    eccentricity,
  );
  const argumentOfPerihelionDeg =
    longitudeOfPerihelionDeg - longitudeOfAscendingNodeDeg;

  const xPrime = semiMajorAxis * (Math.cos(eccentricAnomalyRad) - eccentricity);
  const yPrime =
    semiMajorAxis *
    Math.sqrt(1 - eccentricity * eccentricity) *
    Math.sin(eccentricAnomalyRad);

  const inclinationRad = inclinationDeg * DEG_TO_RAD;
  const longitudeOfAscendingNodeRad =
    longitudeOfAscendingNodeDeg * DEG_TO_RAD;
  const argumentOfPerihelionRad = argumentOfPerihelionDeg * DEG_TO_RAD;

  const cosOmega = Math.cos(longitudeOfAscendingNodeRad);
  const sinOmega = Math.sin(longitudeOfAscendingNodeRad);
  const cosInclination = Math.cos(inclinationRad);
  const sinInclination = Math.sin(inclinationRad);
  const cosArgument = Math.cos(argumentOfPerihelionRad);
  const sinArgument = Math.sin(argumentOfPerihelionRad);

  const x =
    xPrime * (cosOmega * cosArgument - sinOmega * sinArgument * cosInclination) -
    yPrime * (cosOmega * sinArgument + sinOmega * cosArgument * cosInclination);
  const y =
    xPrime * (sinOmega * cosArgument + cosOmega * sinArgument * cosInclination) -
    yPrime * (sinOmega * sinArgument - cosOmega * cosArgument * cosInclination);
  const z =
    xPrime * (sinArgument * sinInclination) +
    yPrime * (cosArgument * sinInclination);

  return {
    name: definition.name,
    x,
    y,
    z,
    color: definition.color,
    accent: definition.accent,
    blurb: definition.blurb,
    radiusKilometers: definition.radiusKilometers,
    radiusAu: definition.radiusKilometers / AU_IN_KILOMETERS,
    distanceFromSunAu: Math.hypot(x, y, z),
    meanAnomalyDeg,
    eccentricAnomalyRad,
    eccentricity,
    inclinationDeg,
    longitudeOfAscendingNodeDeg,
    argumentOfPerihelionDeg,
    meanLongitudeDeg: normalizeDegrees(meanLongitudeDeg),
  };
};

export const PLANET_STATES_2161 = PLANET_DEFINITIONS.map((definition) =>
  computePlanetState(definition),
);

export const PLANET_COORDINATES_2161: PlanetCoordinate[] = PLANET_STATES_2161.map(
  ({ name, x, y, z }) => ({ name, x, y, z }),
);

export const sortPlanetsByHeliocentricDistance = (
  planets: PlanetState[],
): PlanetState[] =>
  [...planets].sort((left, right) => left.distanceFromSunAu - right.distanceFromSunAu);
