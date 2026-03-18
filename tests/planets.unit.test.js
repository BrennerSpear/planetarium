import { describe, expect, test } from "bun:test";

import { PLANET_COORDINATES_2161, PLANET_STATES_2161 } from "../src/planets.ts";

const EXPECTED_COORDINATES = {
  Mercury: { x: -0.347545, y: -0.269786, z: 0.009661 },
  Venus: { x: 0.256914, y: 0.673743, z: -0.005276 },
  Earth: { x: -0.149893, y: -1.004295, z: 0.000415 },
  Mars: { x: 0.709192, y: 1.319342, z: 0.010401 },
  Jupiter: { x: -5.214448, y: -1.601737, z: 0.122324 },
  Saturn: { x: 9.147534, y: -3.290015, z: -0.310697 },
  Uranus: { x: 17.339906, y: -9.985334, z: -0.260903 },
  Neptune: { x: 22.474199, y: -19.961406, z: -0.106997 },
  Pluto: { x: -8.717844, y: 41.862072, z: -1.954816 },
};

describe("planet alignment coordinates", () => {
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
