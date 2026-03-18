import { expect, test } from "@playwright/test";

test("renders the 2161 alignment scene with deterministic controls", async ({ page }) => {
  await page.goto("/?test=1");
  await page.waitForSelector("body[data-scene-ready='true']");

  const labels = page.locator("[data-planet-label]");
  const distanceLabels = page.locator("[data-distance-label]");
  const focusAccent = page.locator("[data-focus-accent]");

  await expect(labels).toHaveCount(9);
  await expect(distanceLabels).toHaveCount(8);
  await expect(page.locator("[data-scale-toggle='visible']")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".helper-copy")).toHaveText(
    "Visible scale preserves the order of the alignment while enlarging planets that would otherwise vanish at system scale.",
  );
  await expect(page.locator("[data-focus-heading]")).toHaveText("The 2161 alignment");
  await expect(page.locator("[data-focus-subheading]")).toHaveText(
    "Approximate heliocentric positions for May 19, 2161, when all nine worlds gather on one side of the Sun.",
  );
  await expect(page.locator("[data-info-category-label]")).toHaveText("Date");
  await expect(page.locator("[data-info-category]")).toHaveText("May 19, 2161");
  await expect(page.locator("[data-info-distance-label]")).toHaveText("Alignment");
  await expect(page.locator("[data-info-distance]")).toHaveText(
    "All nine worlds share the same side of the Sun, arranged outward by heliocentric distance.",
  );
  await expect(page.locator(".footer-panel .lede")).toHaveText(
    "The glowing alignment path follows the planets in heliocentric order, and the floating markers show the spacing between neighboring worlds.",
  );
  await expect(focusAccent).toBeHidden();

  const initialState = await page.evaluate(() => window.__planetariumTestApi?.getState());
  expect(initialState).toBeTruthy();
  expect(initialState?.planetCount).toBe(9);
  expect(initialState?.orbitCount).toBe(9);
  expect(initialState?.julianDate).toBe(2510487.5);
  expect(initialState?.labels).toContain("Pluto");
  expect(initialState?.alignment.connectorCount).toBe(9);
  expect(initialState?.alignment.axisLengthAu).toBeGreaterThan(45);
  expect(initialState?.alignment.axisLengthAu).toBeLessThan(50);
  expect(initialState?.background.starSeed).toBe(2161519);
  expect(initialState?.background.starCount).toBe(4210);
  expect(initialState?.background.layerCount).toBe(3);
  expect(initialState?.alignment.orderedPlanetIds).toEqual([
    "mercury",
    "venus",
    "earth",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
    "pluto",
  ]);
  expect(initialState?.planetDisplayDistancesAu.mercury).toBeGreaterThan(initialState?.planetActualDistancesAu.mercury ?? 0);
  expect(initialState?.planetDisplayDistancesAu.venus).toBeGreaterThan(initialState?.planetActualDistancesAu.venus ?? 0);
  expect(initialState?.planetDisplayDistancesAu.earth).toBeGreaterThan(initialState?.planetActualDistancesAu.earth ?? 0);
  expect(initialState?.planetDisplayDistancesAu.mars).toBeGreaterThan(initialState?.planetActualDistancesAu.mars ?? 0);

  const labelRects = await labels.evaluateAll((nodes) => nodes.map((node) => {
    const element = node as HTMLElement;
    const rect = element.getBoundingClientRect();

    return {
      id: element.dataset.planetLabel ?? "",
      hidden: element.hidden,
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
    };
  }));

  for (const label of labelRects) {
    expect(label.hidden, `${label.id} should render on first load`).toBe(false);
    expect(label.left, `${label.id} should stay inside the left edge`).toBeGreaterThanOrEqual(0);
    expect(label.top, `${label.id} should stay inside the top edge`).toBeGreaterThanOrEqual(0);
    expect(label.right, `${label.id} should stay inside the right edge`).toBeLessThanOrEqual(1440);
    expect(label.bottom, `${label.id} should stay inside the bottom edge`).toBeLessThanOrEqual(900);
  }

  await expect(page.locator(".app-shell")).toHaveScreenshot("planetarium-visible-scale.png");

  const cameraBeforeFocus = initialState?.camera;
  await page.getByRole("button", { name: "Earth" }).click();
  await expect(page.locator("[data-focus-heading]")).toHaveText("Earth");
  await expect(page.locator("[data-info-category]")).toHaveText("Terrestrial");
  await expect(page.locator(".info-panel")).toHaveAttribute("data-focus-source", "selected");
  await expect(focusAccent).toBeVisible();
  await expect(focusAccent).toHaveCSS("background-color", "rgb(158, 212, 255)");

  const focusedState = await page.evaluate(() => window.__planetariumTestApi?.getState());
  expect(focusedState?.selectedPlanetId).toBe("earth");
  expect(focusedState?.camera).not.toEqual(cameraBeforeFocus);
  expect(distanceBetween(focusedState?.camera.position, focusedState?.camera.target)).toBeLessThan(
    distanceBetween(cameraBeforeFocus?.position, cameraBeforeFocus?.target),
  );
  expect(distanceBetween(
    focusedState?.camera.target,
    focusedState?.planetDisplayPositions.earth,
  )).toBeLessThan(0.001);

  await page.getByRole("button", { name: "True scale" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-scale-mode", "true");

  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__planetariumTestApi?.getState());
    return Math.abs((state?.planetDisplayDistancesAu.earth ?? 0) - (state?.planetActualDistancesAu.earth ?? 0));
  }).toBeLessThan(0.00001);

  const trueScaleState = await page.evaluate(() => window.__planetariumTestApi?.getState());

  const beforeCamera = trueScaleState?.camera;

  await page.mouse.move(1230, 760);
  await page.mouse.wheel(0, -420);
  await page.mouse.down();
  await page.mouse.move(1100, 690, { steps: 18 });
  await page.mouse.up();

  const afterCamera = await page.evaluate(() => window.__planetariumTestApi?.getState().camera);
  expect(afterCamera).not.toEqual(beforeCamera);

  await expect(page.locator(".app-shell")).toHaveScreenshot("planetarium-true-scale-earth-orbit.png");
});

function distanceBetween(
  left: [number, number, number] | undefined,
  right: [number, number, number] | undefined,
): number {
  if (!left || !right) {
    return Number.POSITIVE_INFINITY;
  }

  const [leftX, leftY, leftZ] = left;
  const [rightX, rightY, rightZ] = right;
  return Math.hypot(leftX - rightX, leftY - rightY, leftZ - rightZ);
}
