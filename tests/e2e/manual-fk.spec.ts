import { expect, test } from "@playwright/test";

test("manual joint exploration updates FK telemetry", async ({ page }) => {
  await page.goto("/");
  const joint = page.getByRole("slider", { name: "关节 1" });
  const firstX = await page.locator(".metric-grid dd").first().textContent();
  await joint.evaluate((element) => {
    const slider = element as HTMLInputElement;
    slider.value = "0.8";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    slider.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.getByText("45.8°")).toBeVisible();
  await expect.poll(() => page.locator(".metric-grid dd").first().textContent()).not.toBe(firstX);
});
