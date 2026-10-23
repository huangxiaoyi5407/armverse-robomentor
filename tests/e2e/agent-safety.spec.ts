import { expect, test } from "@playwright/test";

test("unsafe agent task is blocked without changing the final pose", async ({ page }) => {
  await page.goto("/");
  const before = await page.getByRole("slider", { name: "关节 1" }).inputValue();
  await page.getByRole("checkbox", { name: "启用安全挑战障碍物" }).check();
  await page.getByRole("button", { name: "启动三 Agent" }).click();
  await expect(page.getByRole("status").filter({ hasText: "危险轨迹已阻断" })).toBeVisible();
  await expect(page.getByRole("slider", { name: "关节 1" })).toHaveValue(before);
});
