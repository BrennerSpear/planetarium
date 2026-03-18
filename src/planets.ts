import {
  BufferGeometry,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from "three";

type PlanetMarkerDefinition = {
  name: string;
  color: string;
  radius: number;
  position: Vector3;
};

const SCAFFOLD_PLANETS: PlanetMarkerDefinition[] = [
  {
    name: "Mercury",
    color: "#cbb79d",
    radius: 0.18,
    position: new Vector3(2.0, 0.15, -0.2),
  },
  {
    name: "Venus",
    color: "#e1c28f",
    radius: 0.28,
    position: new Vector3(3.1, -0.12, 0.12),
  },
  {
    name: "Earth",
    color: "#66b8ff",
    radius: 0.3,
    position: new Vector3(4.4, 0.06, -0.15),
  },
  {
    name: "Mars",
    color: "#d86f45",
    radius: 0.24,
    position: new Vector3(5.6, -0.08, 0.18),
  },
  {
    name: "Jupiter",
    color: "#d6b18d",
    radius: 0.72,
    position: new Vector3(7.4, 0.03, -0.12),
  },
  {
    name: "Saturn",
    color: "#e8d4a4",
    radius: 0.62,
    position: new Vector3(9.2, -0.03, 0.2),
  },
  {
    name: "Uranus",
    color: "#83dbe5",
    radius: 0.42,
    position: new Vector3(10.9, 0.09, -0.08),
  },
  {
    name: "Neptune",
    color: "#4d79ff",
    radius: 0.42,
    position: new Vector3(12.6, -0.1, 0.12),
  },
  {
    name: "Pluto",
    color: "#c9b7a2",
    radius: 0.14,
    position: new Vector3(13.8, 0.04, -0.18),
  },
];

export function createScaffoldPlanetarium() {
  const planetGroup = new Group();
  const linePoints: Vector3[] = [new Vector3(0, 0, 0)];

  const sun = new Mesh(
    new SphereGeometry(1, 48, 48),
    new MeshStandardMaterial({
      color: "#ffcb66",
      emissive: "#ff9c2a",
      emissiveIntensity: 0.75,
      roughness: 0.35,
      metalness: 0.05,
    }),
  );
  sun.name = "Sun";
  planetGroup.add(sun);

  for (const planet of SCAFFOLD_PLANETS) {
    const mesh = new Mesh(
      new SphereGeometry(planet.radius, 32, 32),
      new MeshStandardMaterial({
        color: planet.color,
        roughness: 0.65,
        metalness: 0.08,
      }),
    );

    mesh.position.copy(planet.position);
    mesh.name = planet.name;
    planetGroup.add(mesh);
    linePoints.push(planet.position.clone());
  }

  const spine = new Line(
    new BufferGeometry().setFromPoints(linePoints),
    new LineBasicMaterial({
      color: "#7fd8ff",
      transparent: true,
      opacity: 0.8,
    }),
  );
  spine.name = "Alignment Spine";
  planetGroup.add(spine);

  return {
    planetGroup,
    planetCount: SCAFFOLD_PLANETS.length + 1,
  };
}
