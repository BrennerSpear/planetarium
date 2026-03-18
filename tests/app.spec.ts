import { expect, test } from "@playwright/test";

const waitForSceneReady = async (page: import("@playwright/test").Page) => {
  await page.goto("/?test=1");
  await page.waitForFunction(
    () => window.__PLANETARIUM__?.getSnapshot().ready === true,
  );
};

test("renders the full planetary scene deterministically", async ({ page }) => {
  await waitForSceneReady(page);

  await expect(page.getByTestId("scene-status")).toHaveText("Scene ready");
  await expect(page.getByTestId("planet-button-mercury")).toBeVisible();
  await expect(page.getByTestId("planet-button-pluto")).toBeVisible();

  const snapshot = await page.evaluate(() => window.__PLANETARIUM__?.getSnapshot());
  expect(snapshot?.planetCount).toBe(9);
  expect(snapshot?.distanceLabelCount).toBe(8);

  await expect(page).toHaveScreenshot("planetarium-overview.png", {
    animations: "disabled",
    fullPage: true,
  });
});

test("supports deterministic selection, scaling, and camera control", async ({
  page,
}) => {
  await waitForSceneReady(page);

  await page.getByTestId("planet-button-neptune").click();
  await expect(page.getByTestId("planet-info")).toContainText("Neptune");
  await expect(page.getByTestId("planet-info")).toContainText("30.16 AU");

  const beforeCamera = await page.evaluate(
    () => window.__PLANETARIUM__?.getSnapshot().cameraPosition,
  );

  const canvas = page.getByTestId("planetarium-canvas");
  const bounds = await canvas.boundingBox();
  if (!bounds) {
    throw new Error("Planetarium canvas did not render.");
  }

  await page.mouse.move(bounds.x + bounds.width * 0.68, bounds.y + bounds.height * 0.52);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.48, bounds.y + bounds.height * 0.34, {
    steps: 10,
  });
  await page.mouse.up();

  const afterCamera = await page.evaluate(
    () => window.__PLANETARIUM__?.getSnapshot().cameraPosition,
  );
  const totalDelta =
    Math.abs((beforeCamera?.x ?? 0) - (afterCamera?.x ?? 0)) +
    Math.abs((beforeCamera?.y ?? 0) - (afterCamera?.y ?? 0)) +
    Math.abs((beforeCamera?.z ?? 0) - (afterCamera?.z ?? 0));
  expect(totalDelta).toBeGreaterThan(0.5);

  await page.getByTestId("scale-mode-true").click();
  await expect(page.getByTestId("scale-mode-true")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const trueScaleSnapshot = await page.evaluate(
    () => window.__PLANETARIUM__?.getSnapshot(),
  );
  expect(trueScaleSnapshot?.scaleMode).toBe("true");
  expect(trueScaleSnapshot?.selectedPlanet).toBe("Neptune");

  await expect(page.getByTestId("distance-label-0")).toBeVisible();
  await expect(page).toHaveScreenshot("planetarium-true-scale.png", {
    animations: "disabled",
    fullPage: true,
  });
});
