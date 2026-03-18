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
