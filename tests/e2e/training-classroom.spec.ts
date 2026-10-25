import { expect, test } from "@playwright/test";

test("student training produces traceable evidence and teacher drill-down", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "综合实训" }).click();
  await page.getByRole("button", { name: "开始综合实训" }).click();

  await page.getByRole("checkbox", { name: "启用安全挑战障碍物" }).check();
  await page.getByRole("button", { name: "启动三 Agent" }).click();
  await expect(page.getByText("轨迹进入设备禁入区，确定性安全门已阻断执行。")).toBeVisible();

  await page.getByRole("button", { name: "完成本次实训" }).click();
  await expect(page.getByRole("heading", { name: "实训报告" })).toBeVisible();
  await expect(page.getByRole("button", { name: "打印或导出 PDF" })).toBeEnabled();

  await page.getByRole("button", { name: "教师工作台" }).click();
  await expect(page.getByRole("region", { name: "教师工作台" })).toBeVisible();
  await page.getByRole("region", { name: "需关注会话" }).getByRole("button", { name: /查看会话/ }).first().click();
  await expect(page.getByRole("region", { name: "会话详情" })).toContainText("需关注");
  await expect(page.getByRole("region", { name: "会话详情" })).toContainText("安全得分");
});
