import { expect, test } from "@playwright/test";

test("renders the 2161 alignment scene with deterministic controls", async ({ page }) => {
  await page.goto("/?test=1");
  await page.waitForSelector("body[data-scene-ready='true']");

  const labels = page.locator("[data-planet-label]");
  const distanceLabels = page.locator("[data-distance-label]");

  await expect(labels).toHaveCount(9);
  await expect(distanceLabels).toHaveCount(8);
  await expect(page.locator("[data-scale-toggle='visible']")).toHaveAttribute("aria-pressed", "true");

  const initialState = await page.evaluate(() => window.__planetariumTestApi?.getState());
  expect(initialState).toBeTruthy();
  expect(initialState?.planetCount).toBe(9);
  expect(initialState?.julianDate).toBe(2510487.5);
  expect(initialState?.labels).toContain("Pluto");
  expect(initialState?.camera.position[0]).toBeCloseTo(34.3, 1);
  expect(initialState?.camera.position[1]).toBeCloseTo(37.7, 1);
  expect(initialState?.camera.position[2]).toBeCloseTo(88.8, 1);
  expect(initialState?.camera.target[0]).toBeCloseTo(-2.08, 1);
  expect(initialState?.camera.target[1]).toBeCloseTo(0.07, 1);
  expect(initialState?.camera.target[2]).toBeCloseTo(-4.93, 1);
  expect(initialState?.alignment.connectorCount).toBe(9);
  expect(initialState?.alignment.axisLengthAu).toBeGreaterThan(45);
  expect(initialState?.alignment.axisLengthAu).toBeLessThan(48);
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

  await page.getByRole("button", { name: "True scale" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-scale-mode", "true");

  await page.locator("[data-planet-label='earth']").evaluate((node) => {
    (node as HTMLButtonElement).click();
  });
  await expect(page.locator("[data-focus-heading]")).toHaveText("Earth");
  await expect(page.locator("[data-info-category]")).toHaveText("Terrestrial");

  const beforeCamera = await page.evaluate(() => window.__planetariumTestApi?.getState().camera);

  await page.mouse.move(1230, 760);
  await page.mouse.wheel(0, -420);
  await page.mouse.down();
  await page.mouse.move(1100, 690, { steps: 18 });
  await page.mouse.up();

  const afterCamera = await page.evaluate(() => window.__planetariumTestApi?.getState().camera);
  expect(afterCamera).not.toEqual(beforeCamera);
});
