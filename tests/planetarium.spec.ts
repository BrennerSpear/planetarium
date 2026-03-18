import { expect, test, type Page } from "@playwright/test";

test("renders the 2161 alignment scene with deterministic controls", async ({ page }) => {
  await page.goto("/?test=1");
  await page.waitForSelector("body[data-scene-ready='true']");
  await waitForStableFrame(page);

  const labels = page.locator("[data-planet-label]");
  const distanceLabels = page.locator("[data-distance-label]");
  const focusAccent = page.locator("[data-focus-accent]");

  await expect(labels).toHaveCount(8);
  await expect(distanceLabels).toHaveCount(7);
  await expect(page.locator("[data-scale-toggle='visible']")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".helper-copy")).toHaveText(
    "Visible scale preserves the order of the alignment while enlarging planets that would otherwise vanish at system scale.",
  );
  await expect(page.locator("[data-focus-heading]")).toHaveText("The 2161 alignment");
  await expect(page.locator("[data-focus-subheading]")).toHaveText(
    "Approximate heliocentric positions for May 19, 2161, when all eight planets gather on one side of the Sun.",
  );
  await expect(page.locator("[data-info-category-label]")).toHaveText("Date");
  await expect(page.locator("[data-info-category]")).toHaveText("May 19, 2161");
  await expect(page.locator("[data-info-distance-label]")).toHaveText("Alignment");
  await expect(page.locator("[data-info-distance]")).toHaveText(
    "All eight planets share the same side of the Sun, arranged outward by heliocentric distance.",
  );
  await expect(page.locator(".footer-panel .lede")).toHaveText(
    "The glowing alignment path follows the planets in heliocentric order, and the floating markers show the spacing between neighboring worlds.",
  );
  await expect(focusAccent).toBeHidden();

  const initialState = await page.evaluate(() => window.__planetariumTestApi?.getState());
  expect(initialState).toBeTruthy();
  expect(initialState?.planetCount).toBe(8);
  expect(initialState?.orbitCount).toBe(8);
  expect(initialState?.julianDate).toBe(2510487.5);
  expect(initialState?.labels).not.toContain("Pluto");
  expect(initialState?.alignment.connectorCount).toBe(8);
  expect(initialState?.alignment.axisLengthAu).toBeGreaterThan(28);
  expect(initialState?.alignment.axisLengthAu).toBeLessThan(31);
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
  ]);
  expect(initialState?.alignment.orderedPlanetIds.at(-1)).toBe("neptune");
  expect(initialState?.planetDisplayDistancesAu.mercury).toBeGreaterThan(initialState?.planetActualDistancesAu.mercury ?? 0);
  expect(initialState?.planetDisplayDistancesAu.venus).toBeGreaterThan(initialState?.planetActualDistancesAu.venus ?? 0);
  expect(initialState?.planetDisplayDistancesAu.earth).toBeGreaterThan(initialState?.planetActualDistancesAu.earth ?? 0);
  expect(initialState?.planetDisplayDistancesAu.mars).toBeGreaterThan(initialState?.planetActualDistancesAu.mars ?? 0);
  expect(initialState?.visuals.saturn.ringTiltDeg).toBeCloseTo(26.7, 1);
  expect(initialState?.visuals.saturn.ringOuterRadius).toBeGreaterThan(initialState?.visuals.saturn.radius ?? 0);
  expect(initialState?.visuals.sun.glowRadius).toBeGreaterThan(initialState?.visuals.sun.radius ?? 0);

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

  const cameraDistance = distanceBetween(initialState?.camera.position, initialState?.camera.target);
  expect(cameraDistance).toBeLessThan(60);

  await expect(page.locator(".app-shell")).toHaveScreenshot("planetarium-visible-scale.png");

  const cameraBeforeFocus = initialState?.camera;
  await page.getByRole("button", { name: "Earth" }).click();
  await expect(page.locator("[data-focus-heading]")).toHaveText("Earth");
  await expect(page.locator("[data-info-category]")).toHaveText("Terrestrial");

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
  await waitForStableFrame(page);

  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__planetariumTestApi?.getState());
    return Math.abs((state?.planetDisplayDistancesAu.earth ?? 0) - (state?.planetActualDistancesAu.earth ?? 0));
  }).toBeLessThan(0.00001);

  const trueScaleState = await page.evaluate(() => window.__planetariumTestApi?.getState());
  expect(trueScaleState?.visuals.saturn.ringOuterRadius).toBeLessThan(
    initialState?.visuals.saturn.ringOuterRadius ?? Number.POSITIVE_INFINITY,
  );
  expect(trueScaleState?.visuals.sun.glowRadius).toBeLessThan(
    initialState?.visuals.sun.glowRadius ?? Number.POSITIVE_INFINITY,
  );

  await page.locator("[data-planet-label='earth']").evaluate((node) => {
    (node as HTMLButtonElement).click();
  });
  await expect(page.locator("[data-focus-heading]")).toHaveText("Earth");
  await expect(page.locator("[data-info-category]")).toHaveText("Terrestrial");
  await expect(page.locator(".info-panel")).toHaveAttribute("data-focus-source", "selected");
  await expect(focusAccent).toBeVisible();
  await expect(focusAccent).toHaveCSS("background-color", "rgb(158, 212, 255)");

  const beforeCamera = await page.evaluate(() => window.__planetariumTestApi?.getState().camera);

  await page.mouse.move(1230, 760);
  await page.mouse.wheel(0, -420);
  await page.mouse.down();
  await page.mouse.move(1100, 690, { steps: 18 });
  await page.mouse.up();

  const afterCamera = await page.evaluate(() => window.__planetariumTestApi?.getState().camera);
  expect(afterCamera).not.toEqual(beforeCamera);

  await expect(page.locator(".app-shell")).toHaveScreenshot("planetarium-true-scale-earth-orbit.png");
});

test("renders Saturn rings and Sun glow closeups deterministically", async ({ page }) => {
  await page.goto("/?test=1");
  await page.waitForSelector("body[data-scene-ready='true']");
  await waitForStableFrame(page);
  await hideUiChromeForCapture(page);

  await framePlanet(page, "saturn");
  const saturnState = await page.evaluate(() => window.__planetariumTestApi?.getState());
  expect(saturnState?.visuals.saturn.ringOpacity).toBeGreaterThan(0.8);
  await expect(page.locator("[data-scene-root]")).toHaveScreenshot("planetarium-saturn-rings.png");

  await framePlanet(page, "sun");
  const sunState = await page.evaluate(() => window.__planetariumTestApi?.getState());
  expect(sunState?.visuals.sun.glowOpacity).toBeGreaterThan(0.5);
  await expect(page.locator("[data-scene-root]")).toHaveScreenshot("planetarium-sun-glow.png");
});

async function framePlanet(page: Page, planetId: string): Promise<void> {
  const framed = await page.evaluate((targetPlanetId) => window.__planetariumTestApi?.framePlanet(targetPlanetId), planetId);
  expect(framed).toBe(true);
  await waitForStableFrame(page);
}

async function waitForStableFrame(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  });
}

async function hideUiChromeForCapture(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelector<HTMLElement>("[data-hud-root]")?.style.setProperty("display", "none");
    document.querySelector<HTMLElement>("[data-overlay-root]")?.style.setProperty("display", "none");
  });
}

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
