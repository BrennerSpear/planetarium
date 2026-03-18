import { expect, test } from "@playwright/test";

test("renders the scaffold scene and responds to orbit input", async ({ page }) => {
  await page.goto("/?e2e=1");

  await expect(page.locator("body")).toHaveAttribute("data-render-ready", "true");
  await expect(page.getByTestId("render-status")).toHaveText("Scene ready");
  await expect(page.getByText("Three.js Orbit Scaffold")).toBeVisible();

  const canvas = page.getByTestId("scene-canvas");
  await expect(canvas).toBeVisible();

  const initialState = await page.evaluate(() => {
    if (!window.__PLANETARIUM__) {
      throw new Error("Planetarium test API is unavailable");
    }

    return {
      camera: window.__PLANETARIUM__.getCameraPosition(),
      pixel: window.__PLANETARIUM__.sampleCenterPixel(),
      planetCount: window.__PLANETARIUM__.planetCount,
      renderCount: window.__PLANETARIUM__.renderCount,
    };
  });

  expect(initialState.planetCount).toBe(10);
  expect(initialState.pixel[0] + initialState.pixel[1] + initialState.pixel[2]).toBeGreaterThan(60);

  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("Canvas bounding box not available");
  }

  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.36, {
    steps: 12,
  });
  await page.mouse.up();

  await expect
    .poll(async () => {
      return page.evaluate(() => window.__PLANETARIUM__?.renderCount ?? 0);
    })
    .toBeGreaterThan(initialState.renderCount);

  const finalState = await page.evaluate(() => {
    if (!window.__PLANETARIUM__) {
      throw new Error("Planetarium test API is unavailable");
    }

    return {
      camera: window.__PLANETARIUM__.getCameraPosition(),
    };
  });

  expect(finalState.camera).not.toEqual(initialState.camera);
  await expect(page.getByTestId("camera-summary")).not.toHaveText("0.00, 4.00, 16.00");
});
