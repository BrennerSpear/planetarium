import { describe, expect, test } from "bun:test";

import {
  ALIGNMENT_JULIAN_DATE,
  PLANET_COORDINATES_2161,
  PLANET_STATES_2161,
} from "../src/planets.ts";

const EXPECTED_COORDINATES = {
  Mercury: { x: -0.061707, y: -0.461061, z: -0.032114 },
  Venus: { x: 0.315679, y: -0.655378, z: -0.02747 },
  Earth: { x: -0.563259, y: -0.839747, z: 0.000344 },
  Mars: { x: 0.101004, y: -1.444575, z: -0.032736 },
  Jupiter: { x: -2.08004, y: -4.927429, z: 0.066456 },
  Saturn: { x: -6.654204, y: -7.305856, z: 0.39305 },
  Uranus: { x: 6.571011, y: -18.424884, z: -0.152957 },
  Neptune: { x: 13.437475, y: -27.000894, z: 0.246279 },
  Pluto: { x: -0.556544, y: 44.586019, z: -4.607293 },
};

describe("planet alignment coordinates", () => {
  test("uses the corrected Julian Date for May 19, 2161", () => {
    expect(ALIGNMENT_JULIAN_DATE).toBe(2_510_487.5);
  });

  test("returns nine heliocentric coordinates in AU for the 2161 alignment date", () => {
    expect(PLANET_COORDINATES_2161).toHaveLength(9);

    for (const planet of PLANET_COORDINATES_2161) {
      const expected = EXPECTED_COORDINATES[planet.name];
      expect(planet.x).toBeCloseTo(expected.x, 6);
      expect(planet.y).toBeCloseTo(expected.y, 6);
      expect(planet.z).toBeCloseTo(expected.z, 6);
    }
  });

  test("keeps orbital distances in physically plausible ranges", () => {
    const distanceByPlanet = new Map(
      PLANET_STATES_2161.map((planet) => [planet.name, planet.distanceFromSunAu]),
    );

    expect(distanceByPlanet.get("Mercury")).toBeGreaterThan(0.3);
    expect(distanceByPlanet.get("Mercury")).toBeLessThan(0.5);
    expect(distanceByPlanet.get("Earth")).toBeGreaterThan(0.95);
    expect(distanceByPlanet.get("Earth")).toBeLessThan(1.1);
    expect(distanceByPlanet.get("Jupiter")).toBeGreaterThan(5);
    expect(distanceByPlanet.get("Saturn")).toBeGreaterThan(9);
    expect(distanceByPlanet.get("Neptune")).toBeGreaterThan(29.5);
    expect(distanceByPlanet.get("Neptune")).toBeLessThan(30.5);
    expect(distanceByPlanet.get("Pluto")).toBeGreaterThan(40);
  });
});
