import { expect, test } from "@playwright/test";

test("completed report preserves provenance, disclosure, and print action", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "综合实训" }).click();
  await expect(page.getByText("教学演示合成数据，不代表真实学生表现")).toBeVisible();
  await page.getByRole("button", { name: "开始综合实训" }).click();
  await page.getByRole("button", { name: "完成本次实训" }).click();

  const report = page.getByRole("region", { name: "实训报告" });
  await expect(report).toContainText("证据：");
  await expect(report).toContainText("教学演示合成数据，不代表真实学生表现");
  await page.evaluate(() => { window.print = () => { document.body.dataset.printInvoked = "true"; }; });
  await page.getByRole("button", { name: "打印或导出 PDF" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-print-invoked", "true");
});
