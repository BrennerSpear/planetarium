import { expect, test, type Page } from "@playwright/test";

test("renders the 2161 alignment scene with deterministic controls", async ({ page }) => {
  await page.goto("/?test=1");
  await page.waitForSelector("body[data-scene-ready='true']");
  await waitForStableFrame(page);

  const hud = page.locator("[data-hud-root]");
  const sidebar = page.locator("[data-sidebar]");
  const sidebarDatePill = page.locator("[data-sidebar-date-pill]");
  const labels = page.locator("[data-planet-label]");
  const distanceLabels = page.locator("[data-distance-label]");
  const alignmentGuideLayer = page.locator("[data-alignment-guide-layer]");
  const distanceLabelLayer = page.locator("[data-distance-label-layer]");
  const focusAccent = page.locator("[data-focus-accent]");
  const rankingsDisclosure = page.locator("[data-rankings-disclosure]");
  const rankingsTable = page.locator("[data-rankings-table]");

  await expect(hud).toHaveAttribute("data-sidebar-mode", "desktop");
  await expect(hud).toHaveAttribute("data-sidebar-open", "true");
  await expect(sidebar).toHaveAttribute("aria-hidden", "false");
  await expect(page.getByRole("button", { name: "Hide sidebar" })).toBeVisible();
  await expect(sidebarDatePill).toHaveAttribute("aria-hidden", "true");
  await page.getByRole("button", { name: "Hide sidebar" }).click();
  await expect(hud).toHaveAttribute("data-sidebar-open", "false");
  await expect(sidebar).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("button", { name: "Show sidebar" })).toBeVisible();
  await expect(sidebarDatePill).toHaveAttribute("aria-hidden", "false");
  await expect(sidebarDatePill).toContainText("MAY 19, 2161");
  await page.getByRole("button", { name: "Show sidebar" }).click();
  await expect(hud).toHaveAttribute("data-sidebar-open", "true");
  await expect(sidebar).toHaveAttribute("aria-hidden", "false");

  await expect(labels).toHaveCount(8);
  await expect(distanceLabels).toHaveCount(0);
  await expect(alignmentGuideLayer).toHaveCount(0);
  await expect(distanceLabelLayer).toHaveCount(0);
  await expect(page.locator("[data-scale-toggle-row]")).toHaveCount(0);
  await expect(page.locator("[data-scale-toggle]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Visible scale" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "True scale" })).toHaveCount(0);
  await expect(page.locator(".helper-copy")).toHaveCount(0);
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
  await expect(page.locator("[data-info-radius-label]")).toHaveText("Scale");
  await expect(page.locator("[data-info-radius]")).toHaveText(
    "Planet sizes are tuned for legibility so the full alignment remains readable at solar-system distances.",
  );
  await expect(page.locator(".footer-panel .lede")).toHaveText(
    "Floating planet names and faint orbital rings keep the alignment legible while you pan, orbit, and zoom.",
  );
  await expect(rankingsDisclosure).toHaveJSProperty("open", false);
  await expect(rankingsTable).toBeHidden();
  await page.locator("[data-rankings-toggle]").click();
  await expect(rankingsDisclosure).toHaveJSProperty("open", true);
  await expect(rankingsTable).toBeVisible();
  await expect(page.locator("[data-rankings-row]")).toHaveCount(15);
  await expect(page.locator("[data-rankings-row][data-current='true']")).toHaveCount(1);
  await expect(page.locator("[data-rankings-row][data-tightest='true']")).toHaveCount(1);
  await expect(page.locator("[data-rankings-row][data-current='true']")).toContainText("★ You are here");
  await expect(page.locator("[data-rankings-footnote]")).toContainText(
    "Computed from JPL Keplerian elements (J2000 epoch). Spread = minimum arc containing all 8 planets.",
  );

  await expect(focusAccent).toBeHidden();

  const historicalRows = await page.locator("[data-rankings-row]").evaluateAll((rows) => rows.map((row) => {
    const cells = Array.from(row.querySelectorAll("td"), (cell) => cell.textContent?.replace(/\s+/g, " ").trim() ?? "");

    return {
      rank: cells[0] ?? "",
      date: cells[1] ?? "",
      spread: cells[2] ?? "",
      current: row.getAttribute("data-current") ?? "false",
      tightest: row.getAttribute("data-tightest") ?? "false",
    };
  }));

  expect(historicalRows.map((row) => row.date)).toEqual([
    "Dec 1, 117",
    "Jan 24, 449",
    "Jan 26, 628",
    "Feb 6, 949",
    "Jul 4, 987",
    "Jun 13, 989",
    "Apr 18, 1128",
    "Sep 8, 1166",
    "Apr 23, 1307",
    "Jun 9, 1817",
    "May 19, 2161 ★ You are here",
    "Nov 8, 2176",
    "Sep 30, 2851",
    "Jan 7, 2892",
    "Jul 22, 2992",
  ]);
  expect(historicalRows.map((row) => row.rank)).toEqual([
    "#13",
    "#3",
    "#4",
    "#11",
    "#5",
    "#9",
    "#1",
    "#7",
    "#2",
    "#15",
    "#6",
    "#10",
    "#12",
    "#14",
    "#8",
  ]);

  const tightestRow = historicalRows.find((row) => row.tightest === "true");
  expect(tightestRow).toEqual({
    rank: "#1",
    date: "Apr 18, 1128",
    spread: "40.7°",
    current: "false",
    tightest: "true",
  });

  const currentRow = historicalRows.find((row) => row.current === "true");
  expect(currentRow).toEqual({
    rank: "#6",
    date: "May 19, 2161 ★ You are here",
    spread: "68.8°",
    current: "true",
    tightest: "false",
  });

  await page.locator("[data-rankings-toggle]").click();
  await expect(rankingsDisclosure).toHaveJSProperty("open", false);
  await expect(rankingsTable).toBeHidden();

  const initialState = await page.evaluate(() => window.__planetariumTestApi?.getState());
  expect(initialState).toBeTruthy();
  expect(initialState?.scaleMode).toBe("visible");
  expect(initialState?.planetCount).toBe(8);
  expect(initialState?.orbitCount).toBe(8);
  expect(initialState?.julianDate).toBe(2510487.5);
  expect(initialState?.labels).not.toContain("Pluto");
  expect(initialState?.alignment.connectorCount).toBe(0);
  expect(initialState?.alignment.axisLengthAu).toBe(0);
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
  expect(initialState?.visuals.saturn.radius).toBeGreaterThan(0.27);
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
  expect(focusedState?.planetDisplayDistancesAu.earth).toBeGreaterThan(
    focusedState?.planetActualDistancesAu.earth ?? 0,
  );
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
  const postInteractionState = await page.evaluate(() => window.__planetariumTestApi?.getState());
  expect(afterCamera).not.toEqual(beforeCamera);
  expect(postInteractionState?.scaleMode).toBe("visible");
  expect(postInteractionState?.planetDisplayDistancesAu.earth).toBeGreaterThan(
    postInteractionState?.planetActualDistancesAu.earth ?? 0,
  );
  expect(postInteractionState?.visuals.saturn.ringOuterRadius).toBeCloseTo(
    initialState?.visuals.saturn.ringOuterRadius ?? 0,
    6,
  );
  expect(postInteractionState?.visuals.sun.glowRadius).toBeCloseTo(
    initialState?.visuals.sun.glowRadius ?? 0,
    6,
  );

  await expect(page.locator(".app-shell")).toHaveScreenshot("planetarium-earth-focus.png");
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

test.describe("mobile sidebar toggle", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: false,
  });

  test("starts collapsed on mobile and expands on demand", async ({ page }) => {
    await page.goto("/?test=1");
    await page.waitForSelector("body[data-scene-ready='true']");
    await waitForStableFrame(page);

    const hud = page.locator("[data-hud-root]");
    const sidebar = page.locator("[data-sidebar]");
    const datePill = page.locator("[data-sidebar-date-pill]");

    await expect(hud).toHaveAttribute("data-sidebar-mode", "mobile");
    await expect(hud).toHaveAttribute("data-sidebar-open", "false");
    await expect(sidebar).toHaveAttribute("aria-hidden", "true");
    await expect(page.getByRole("button", { name: "Show sidebar" })).toBeVisible();
    await expect(datePill).toHaveAttribute("aria-hidden", "false");
    await expect(datePill).toContainText("MAY 19, 2161");
    await expect(page.locator(".app-shell")).toHaveScreenshot("planetarium-mobile-sidebar-hidden.png");

    await page.getByRole("button", { name: "Show sidebar" }).click();
    await expect(hud).toHaveAttribute("data-sidebar-open", "true");
    await expect(sidebar).toHaveAttribute("aria-hidden", "false");
    await expect(page.getByRole("button", { name: "Hide sidebar" })).toBeVisible();
    await expect(datePill).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".app-shell")).toHaveScreenshot("planetarium-mobile-sidebar-open.png");

    await page.getByRole("button", { name: "Hide sidebar" }).click();
    await expect(hud).toHaveAttribute("data-sidebar-open", "false");
    const cameraBeforeOrbit = await page.evaluate(() => window.__planetariumTestApi?.getState().camera);
    await page.mouse.move(320, 560);
    await page.mouse.down();
    await page.mouse.move(272, 498, { steps: 12 });
    await page.mouse.up();
    const cameraAfterOrbit = await page.evaluate(() => window.__planetariumTestApi?.getState().camera);
    expect(cameraAfterOrbit).not.toEqual(cameraBeforeOrbit);
  });
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
