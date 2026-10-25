import { expect, test } from "@playwright/test";

test("PID presets remain distinct with disclosed teaching dynamics", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "PID 控制实验" }).click();
  const metrics = page.getByRole("region", { name: "PID 响应指标" });
  const stable = await metrics.textContent();

  await page.getByRole("button", { name: "欠调预设" }).click();
  const under = await metrics.textContent();
  await expect(page.getByRole("spinbutton", { name: "Kp" })).toHaveValue("0.2");

  await page.getByRole("button", { name: "过调预设" }).click();
  const over = await metrics.textContent();
  expect(new Set([stable, under, over]).size).toBe(3);
  await expect(page.getByText("教学简化模型，不用于真实机械臂选型或安全控制")).toBeVisible();
  await expect(page.getByRole("region", { name: "教学模型状态" })).toContainText("估算扭矩");
});

test("industrial interface simulation enforces connection and emergency-stop states", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "工业接口实验" }).click();
  await expect(page.getByText("接口模拟，未连接真实机械臂")).toBeVisible();
  const exportButton = page.getByRole("button", { name: "导出已审批轨迹 JSON" });
  await expect(exportButton).toBeDisabled();

  await page.getByRole("button", { name: "连接模拟网关" }).click();
  await page.getByRole("button", { name: "完成模拟握手" }).click();
  await expect(exportButton).toBeEnabled();
  await page.getByRole("button", { name: "模拟急停" }).click();
  await expect(page.getByRole("status", { name: "网关状态" })).toHaveText("急停");
  await expect(exportButton).toBeDisabled();
});
