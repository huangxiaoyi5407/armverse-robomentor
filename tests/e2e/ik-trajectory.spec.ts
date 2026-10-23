import { expect, test } from "@playwright/test";

test("reachable IK target can be previewed and played", async ({ page }) => {
  await page.goto("/");
  const frameMeasurement = page.evaluate(() => new Promise<{ frames: number; elapsed: number }>((resolve) => {
    let frames = 0;
    const started = performance.now();
    const sample = (now: number) => {
      frames += 1;
      if (now - started >= 5_000) resolve({ frames, elapsed: now - started });
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
  await page.getByRole("button", { name: "求解逆运动学并预览" }).click();
  await expect(page.getByRole("status", { name: "仿真状态" })).toHaveText("轨迹预览");
  await page.getByRole("button", { name: "播放轨迹" }).click();
  const sliders = page.getByRole("slider", { name: /关节 \d/ });
  const startJoints = await sliders.evaluateAll((elements) => elements.map((element) => Number((element as HTMLInputElement).value)));
  await page.waitForTimeout(1_000);
  const movingJoints = await sliders.evaluateAll((elements) => elements.map((element) => Number((element as HTMLInputElement).value)));
  expect(movingJoints.some((value, index) => Math.abs(value - startJoints[index]) > 1e-5)).toBe(true);
  await expect(page.getByRole("status", { name: "仿真状态" })).toHaveText("轨迹完成", { timeout: 6_000 });
  const measurement = await frameMeasurement;
  const fps = measurement.frames / (measurement.elapsed / 1_000);
  console.log(`FPS_EVIDENCE frames=${measurement.frames} elapsedMs=${measurement.elapsed.toFixed(1)} averageFps=${fps.toFixed(1)}`);
  expect(fps).toBeGreaterThanOrEqual(30);
});
